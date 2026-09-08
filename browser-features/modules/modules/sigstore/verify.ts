// SPDX-License-Identifier: MPL-2.0
/**
 * sigstore の bundle(keyless、hashedrekord)を、外に依存せずに確かめる。
 *
 * 確かめること(順):
 * 1. bundle の版と形(messageSignature + verificationMaterial.certificate / x509CertificateChain)
 * 2. leaf cert の identity(SAN の URI)と issuer(Fulcio の拡張)が、期待と一致する
 * 3. leaf cert が trusted root の Fulcio の chain に繋がる(署名を辿る)。CA でない
 * 4. artifact の sha256 が messageDigest と一致し、署名が leaf の鍵で正しい
 * 5. Rekor の entry: logId が trusted root の tlog にあり、integratedTime が cert の有効期間の中で、今より前。
 *    canonicalizedBody の中身(hash / signature / cert)が bundle と一致。
 *    inclusionPromise(SET)か、inclusionProof + checkpoint のどちらか以上が正しい
 *
 * 未対応(reason に正直に出る。registry 側は npm の @sigstore/verify で全部確かめる):
 * - DSSE(in-toto)。drops は messageSignature
 * - Rekor v2(hashedrekord 0.0.2、body が protobuf)と、TSA(RFC3161)だけの時刻
 * - SCT(CT log)の検証。RSA の CA
 * Firefox の中でも Deno でも動く(WebCrypto と atob だけ)。
 */
import { base64ToBytes, bytesEqual, bytesToHex } from "./der.ts";
import { ecdsaDerToRaw, extensionString, importCertPublicKey, parseCertificate, verifyCertSignature, type X509 } from "./x509.ts";

// Fulcio の拡張 OID(https://github.com/sigstore/fulcio/blob/main/docs/oid-info.md)
const OID_ISSUER_V1 = "1.3.6.1.4.1.57264.1.1"; // 生の文字列(古い)
const OID_ISSUER_V2 = "1.3.6.1.4.1.57264.1.8"; // DER UTF8String

export interface TrustedRoot {
  tlogs: { baseUrl: string; logId: { keyId: string }; publicKey: { rawBytes: string; keyDetails: string; validFor?: { start?: string; end?: string } } }[];
  certificateAuthorities: { uri?: string; certChain: { certificates: { rawBytes: string }[] }; validFor?: { start?: string; end?: string } }[];
}

export interface VerifyOptions {
  identity: string; // 例: https://github.com/<owner>/<repo>/.github/workflows/drop.yml@refs/heads/main
  issuer: string; // 例: https://token.actions.githubusercontent.com
  artifact: Uint8Array; // 署名された bytes(manifest.json)
  now?: Date;
}

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  identity?: string;
  issuer?: string;
  integratedTime?: Date;
  logIndex?: number;
  logId?: string; // hex
  rekorUrl?: string;
  certNotBefore?: Date;
  certNotAfter?: Date;
  checked: string[]; // 通った段(表示用)
}

type Json = Record<string, unknown>;

const fail = (reason: string, checked: string[]): VerifyResult => ({ ok: false, reason, checked });

export async function verifyBundle(bundle: unknown, root: TrustedRoot, opts: VerifyOptions): Promise<VerifyResult> {
  const checked: string[] = [];
  const now = opts.now ?? new Date();
  const b = bundle as Json;
  if (!b || typeof b !== "object") return fail("bundle is not an object", checked);

  // 1. 版と形
  const mediaType = String(b.mediaType ?? "");
  const m = mediaType.match(/^application\/vnd\.dev\.sigstore\.bundle(?:\.v(\d+\.\d+))?\+json(?:;version=(\d+\.\d+))?$/);
  const version = m?.[1] ?? m?.[2];
  if (!version || !["0.1", "0.2", "0.3"].includes(version)) return fail(`unknown bundle mediaType: ${mediaType}`, checked);
  const vm = b.verificationMaterial as Json | undefined;
  if (!vm) return fail("no verificationMaterial", checked);
  if (b.dsseEnvelope) return fail("DSSE envelope is not supported (drops use messageSignature)", checked);
  const ms = b.messageSignature as Json | undefined;
  if (!ms || typeof ms.signature !== "string") return fail("no messageSignature", checked);
  checked.push(`bundle v${version}`);

  // cert(leaf)。v0.3 は certificate、v0.1/0.2 は x509CertificateChain(leaf が先頭)
  let certDers: Uint8Array[] = [];
  const certObj = vm.certificate as Json | undefined;
  const chainObj = vm.x509CertificateChain as Json | undefined;
  if (certObj?.rawBytes) certDers = [base64ToBytes(String(certObj.rawBytes))];
  else if (chainObj && Array.isArray(chainObj.certificates)) certDers = (chainObj.certificates as Json[]).map((c) => base64ToBytes(String(c.rawBytes)));
  if (certDers.length === 0) return fail("no certificate in bundle", checked);
  if (vm.publicKey) return fail("publicKey (non-keyless) bundles are not supported here", checked);

  let leaf: X509;
  try {
    leaf = parseCertificate(certDers[0]);
  } catch (e) {
    return fail(`leaf certificate unparsable: ${e}`, checked);
  }
  if (leaf.isCA) return fail("leaf certificate is a CA", checked);
  const bundledIntermediates = certDers.slice(1).map(parseCertificate);
  // bundle が root を持ち歩いていたら疑う(trusted root の chain と同じ cert が入っている)
  const rootCerts = root.certificateAuthorities.flatMap((ca) => ca.certChain.certificates.map((c) => base64ToBytes(c.rawBytes)));
  if (bundledIntermediates.some((c) => c.isCA && rootCerts.some((r) => bytesEqual(r, c.raw)))) {
    return fail("bundle carries a trusted root/CA certificate", checked);
  }

  // 2. identity と issuer
  const identity = leaf.sanUris[0];
  if (!identity) return fail("leaf certificate has no SAN URI", checked);
  if (identity !== opts.identity) return fail(`identity mismatch: ${identity}`, checked);
  const issuer = extensionString(leaf, OID_ISSUER_V2) ?? extensionString(leaf, OID_ISSUER_V1);
  if (!issuer) return fail("leaf certificate has no OIDC issuer extension", checked);
  if (issuer !== opts.issuer) return fail(`issuer mismatch: ${issuer}`, checked);
  checked.push("identity/issuer");

  // 3. chain: leaf ← (bundle の intermediates) ← trusted root の chain
  const chainOk = await chainsToTrustedRoot(leaf, bundledIntermediates, root);
  if (!chainOk) return fail("certificate does not chain to a trusted Fulcio CA", checked);
  checked.push("fulcio chain");

  // 4. artifact の digest と署名
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", opts.artifact as BufferSource));
  const md = ms.messageDigest as Json | undefined;
  if (md) {
    if (String(md.algorithm) !== "SHA2_256") return fail(`unsupported digest algorithm ${md.algorithm}`, checked);
    if (!bytesEqual(base64ToBytes(String(md.digest)), digest)) return fail("artifact digest mismatch", checked);
  }
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64ToBytes(String(ms.signature));
  } catch {
    return fail("signature is not base64", checked);
  }
  const sigOk = await verifyMessageSignature(leaf, sigBytes, opts.artifact);
  if (!sigOk) return fail("signature does not verify with the leaf certificate", checked);
  checked.push("signature");

  // 5. Rekor
  const entries = (vm.tlogEntries as Json[] | undefined) ?? [];
  if (entries.length === 0) return fail("no transparency log entry", checked);
  const e = entries[0];
  const logIdB64 = String((e.logId as Json | undefined)?.keyId ?? "");
  const tlog = root.tlogs.find((t) => t.logId.keyId === logIdB64);
  if (!tlog) return fail("log entry is from an unknown transparency log", checked);
  const logIndex = Number(e.logIndex);
  if (!Number.isInteger(logIndex) || logIndex < 0) return fail(`bad logIndex ${e.logIndex}`, checked);
  const kv = e.kindVersion as Json | undefined;
  if (kv && (kv.kind !== "hashedrekord" || kv.version !== "0.0.1")) {
    // Rekor v2(hashedrekord 0.0.2、body が protobuf、時刻は TSA)はブラウザでは確かめない。registry の検証結果を見て
    return fail(`unsupported log entry ${kv.kind}/${kv.version} (browser verifies Rekor v1 only; see the registry's check)`, checked);
  }
  if (e.integratedTime === undefined || e.integratedTime === null) {
    return fail("no integratedTime (TSA-only timestamps are not verified in the browser)", checked);
  }
  const integratedTime = new Date(Number(e.integratedTime) * 1000);
  if (Number.isNaN(integratedTime.getTime())) return fail("bad integratedTime", checked);
  if (integratedTime.getTime() > now.getTime()) return fail("integratedTime is in the future", checked);
  if (integratedTime < leaf.notBefore || integratedTime > leaf.notAfter) return fail("integratedTime is outside the certificate validity", checked);
  if (tlog.publicKey.validFor?.start && integratedTime < new Date(tlog.publicKey.validFor.start)) return fail("log key was not valid at integratedTime", checked);
  if (tlog.publicKey.validFor?.end && integratedTime > new Date(tlog.publicKey.validFor.end)) return fail("log key was no longer valid at integratedTime", checked);

  const body = String(e.canonicalizedBody ?? "");
  if (!body) return fail("no canonicalizedBody", checked);
  const bodyOk = checkHashedRekordBody(body, digest, sigBytes, leaf);
  if (bodyOk !== true) return fail(`log entry body mismatch: ${bodyOk}`, checked);
  checked.push("log entry body");

  const logKey = await importLogKey(tlog);
  let anyProof = false;
  const promise = e.inclusionPromise as Json | undefined;
  if (promise?.signedEntryTimestamp) {
    const setOk = await verifySET(String(promise.signedEntryTimestamp), body, Number(e.integratedTime), logIdB64, logIndex, logKey);
    if (!setOk) return fail("signed entry timestamp (SET) does not verify", checked);
    checked.push("rekor SET");
    anyProof = true;
  }
  const proof = e.inclusionProof as Json | undefined;
  if (proof) {
    const r = await verifyInclusionProof(proof, body, logIndex, logIdB64, logKey);
    if (r !== true) return fail(`inclusion proof: ${r}`, checked);
    checked.push("rekor inclusion proof + checkpoint");
    anyProof = true;
  } else if (version === "0.3") {
    return fail("v0.3 bundle without inclusion proof", checked);
  }
  if (!anyProof) return fail("no inclusion promise or proof", checked);

  return {
    ok: true,
    identity,
    issuer,
    integratedTime,
    logIndex,
    logId: bytesToHex(base64ToBytes(logIdB64)),
    rekorUrl: `${tlog.baseUrl.replace(/\/$/, "")}/api/v1/log/entries?logIndex=${logIndex}`,
    certNotBefore: leaf.notBefore,
    certNotAfter: leaf.notAfter,
    checked,
  };
}

// ---- 3. chain ----
async function chainsToTrustedRoot(leaf: X509, bundled: X509[], root: TrustedRoot): Promise<boolean> {
  for (const ca of root.certificateAuthorities) {
    // trusted root の chain は [intermediate..., root]。CA の validFor が leaf の notBefore を含むこと
    if (ca.validFor?.start && leaf.notBefore < new Date(ca.validFor.start)) continue;
    if (ca.validFor?.end && leaf.notBefore > new Date(ca.validFor.end)) continue;
    const chain = ca.certChain.certificates.map((c) => parseCertificate(base64ToBytes(c.rawBytes)));
    // 候補の issuer: bundle の intermediates と trusted chain の全部
    const pool = [...bundled, ...chain];
    if (await walk(leaf, pool, chain, 0)) return true;
  }
  return false;
}
async function walk(cert: X509, pool: X509[], trusted: X509[], depth: number): Promise<boolean> {
  if (depth > 6) return false;
  for (const issuer of pool) {
    if (!issuer.isCA) continue;
    if (!bytesEqual(cert.issuerRaw, issuer.subjectRaw)) continue;
    let ok = false;
    try {
      ok = await verifyCertSignature(cert, issuer);
    } catch {
      ok = false;
    }
    if (!ok) continue;
    if (cert.notBefore < issuer.notBefore || cert.notBefore > issuer.notAfter) continue;
    // 信用する chain の cert に着いたら OK(その先は trusted root が保証する)
    if (trusted.some((t) => bytesEqual(t.raw, issuer.raw))) return true;
    if (await walk(issuer, pool.filter((p) => p !== issuer), trusted, depth + 1)) return true;
  }
  return false;
}

// ---- 4. signature ----
async function verifyMessageSignature(leaf: X509, sig: Uint8Array, artifact: Uint8Array): Promise<boolean> {
  const { key, algorithm } = await importCertPublicKey(leaf);
  try {
    if ((algorithm as { name: string }).name === "Ed25519") {
      return await crypto.subtle.verify({ name: "Ed25519" }, key, sig as BufferSource, artifact as BufferSource);
    }
    const raw = ecdsaDerToRaw(sig, leaf.namedCurve);
    const hash = leaf.namedCurve === "1.3.132.0.34" ? "SHA-384" : "SHA-256";
    return await crypto.subtle.verify({ name: "ECDSA", hash }, key, raw as BufferSource, artifact as BufferSource);
  } catch {
    return false;
  }
}

// ---- 5. Rekor ----
function checkHashedRekordBody(bodyB64: string, digest: Uint8Array, sig: Uint8Array, leaf: X509): true | string {
  let body: Json;
  try {
    body = JSON.parse(new TextDecoder().decode(base64ToBytes(bodyB64)));
  } catch {
    return "body is not JSON";
  }
  if (body.kind !== "hashedrekord") return `kind ${body.kind} is not hashedrekord`;
  const spec = body.spec as Json;
  const hash = (spec?.data as Json)?.hash as Json;
  if (!hash || String(hash.algorithm) !== "sha256") return "body hash algorithm";
  if (String(hash.value).toLowerCase() !== bytesToHex(digest)) return "body hash value";
  const signature = spec.signature as Json;
  if (!bytesEqual(base64ToBytes(String(signature?.content ?? "")), sig)) return "body signature";
  const pk = (signature?.publicKey as Json)?.content;
  const pem = new TextDecoder().decode(base64ToBytes(String(pk ?? "")));
  const der = base64ToBytes(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
  if (!bytesEqual(der, leaf.raw)) return "body certificate";
  return true;
}

async function importLogKey(tlog: TrustedRoot["tlogs"][number]): Promise<{ key: CryptoKey; ed25519: boolean; spki: Uint8Array }> {
  const spki = base64ToBytes(tlog.publicKey.rawBytes);
  if (tlog.publicKey.keyDetails === "PKIX_ED25519") {
    const key = await crypto.subtle.importKey("spki", spki as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    return { key, ed25519: true, spki };
  }
  const key = await crypto.subtle.importKey("spki", spki as BufferSource, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  return { key, ed25519: false, spki };
}
async function verifyWithLogKey(lk: { key: CryptoKey; ed25519: boolean }, sig: Uint8Array, data: Uint8Array): Promise<boolean> {
  try {
    if (lk.ed25519) return await crypto.subtle.verify({ name: "Ed25519" }, lk.key, sig as BufferSource, data as BufferSource);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, lk.key, ecdsaDerToRaw(sig) as BufferSource, data as BufferSource);
  } catch {
    return false;
  }
}

/** SET = Rekor の鍵による、canonical JSON {"body","integratedTime","logID","logIndex"} への署名 */
async function verifySET(setB64: string, body: string, integratedTime: number, logIdB64: string, logIndex: number, lk: { key: CryptoKey; ed25519: boolean }): Promise<boolean> {
  const logID = bytesToHex(base64ToBytes(logIdB64));
  const canonical = `{"body":${JSON.stringify(body)},"integratedTime":${integratedTime},"logID":"${logID}",` + `"logIndex":${logIndex}}`;
  return verifyWithLogKey(lk, base64ToBytes(setB64), new TextEncoder().encode(canonical));
}

/** RFC 6962 の inclusion proof + checkpoint(署名つきの木の頭) */
async function verifyInclusionProof(proof: Json, body: string, logIndex: number, logIdB64: string, lk: { key: CryptoKey; ed25519: boolean; spki: Uint8Array }): Promise<true | string> {
  const idx = Number(proof.logIndex);
  const size = Number(proof.treeSize);
  if (!Number.isInteger(idx) || !Number.isInteger(size) || idx < 0 || idx >= size) return "bad logIndex/treeSize";
  // entry の logIndex は log 全体の番号、proof の logIndex は今の shard(木)の中の番号。同じとは限らない
  void logIndex;
  const hashes = ((proof.hashes as string[] | undefined) ?? []).map(base64ToBytes);
  const rootHash = base64ToBytes(String(proof.rootHash ?? ""));
  // leaf hash = SHA-256(0x00 || body bytes)
  const bodyBytes = base64ToBytes(body);
  let h = await sha256(concat(new Uint8Array([0]), bodyBytes));
  let i = idx;
  let n = size - 1;
  let used = 0;
  // 右端に寄っている段は inner に数えない(RFC 6962 の verify)
  while (n > 0) {
    if (used >= hashes.length) return "proof too short";
    if (i & 1 || i === n) {
      h = await sha256(concat(new Uint8Array([1]), hashes[used++], h));
      while (!(i & 1) && i !== 0) {
        i >>= 1;
        n >>= 1;
      }
    } else {
      h = await sha256(concat(new Uint8Array([1]), h, hashes[used++]));
    }
    i >>= 1;
    n >>= 1;
  }
  if (used !== hashes.length) return "proof too long";
  if (!bytesEqual(h, rootHash)) return "computed root hash differs";

  // checkpoint(signed note): "origin\n<size>\n<base64 root>\n\n— origin <base64(keyhint4 || sig)>\n"
  const cp = proof.checkpoint as Json | undefined;
  const env = String(cp?.envelope ?? "");
  if (!env) return "no checkpoint";
  const sep = env.indexOf("\n\n");
  if (sep < 0) return "checkpoint has no signature section";
  const note = env.slice(0, sep + 1); // 署名の対象は空行の直前の改行まで
  const lines = note.split("\n");
  if (lines.length < 3) return "checkpoint body too short";
  if (Number(lines[1]) !== size) return "checkpoint tree size differs";
  if (!bytesEqual(base64ToBytes(lines[2]), rootHash)) return "checkpoint root hash differs";
  const keyHint = (await sha256(lk.spki)).subarray(0, 4);
  let sigOk = false;
  for (const line of env.slice(sep + 2).split("\n")) {
    if (!line.startsWith("— ")) continue;
    const parts = line.split(" ");
    const sigB = base64ToBytes(parts[parts.length - 1]);
    if (sigB.length < 5 || !bytesEqual(sigB.subarray(0, 4), keyHint)) continue;
    if (await verifyWithLogKey(lk, sigB.subarray(4), new TextEncoder().encode(note))) {
      sigOk = true;
      break;
    }
  }
  if (!sigOk) return "checkpoint signature does not verify with the log key (or key hint mismatch)";
  return true;
}

async function sha256(b: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", b as BufferSource));
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
