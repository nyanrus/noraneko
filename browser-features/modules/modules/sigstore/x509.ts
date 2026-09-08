// SPDX-License-Identifier: MPL-2.0
/**
 * X.509 の cert から、sigstore の検証に要る所だけを読む。
 * - tbsCertificate(署名の対象の bytes)、signatureAlgorithm、signatureValue
 * - subjectPublicKeyInfo(WebCrypto に importKey できる spki の DER)
 * - notBefore / notAfter
 * - 拡張: SAN の URI(keyless の identity)、Fulcio の OID(issuer など)、basicConstraints(cA)
 */
import { bytesEqual, child, derTime, oidToString, parseDer, type DerNode } from "./der.ts";

export interface X509 {
  raw: Uint8Array;
  tbs: Uint8Array;
  signatureAlgorithm: string; // OID
  signature: Uint8Array; // BIT STRING の中身(先頭の unused-bits byte を除く)
  spki: Uint8Array; // SubjectPublicKeyInfo の DER 全体
  publicKeyAlgorithm: string; // OID(1.2.840.10045.2.1 = ecPublicKey、1.3.101.112 = Ed25519)
  namedCurve?: string; // OID
  notBefore: Date;
  notAfter: Date;
  sanUris: string[];
  isCA: boolean;
  extensions: Map<string, Uint8Array>; // OID → extnValue(OCTET STRING の中身)
  subjectRaw: Uint8Array;
  issuerRaw: Uint8Array;
}

const OID = {
  ecPublicKey: "1.2.840.10045.2.1",
  ed25519: "1.3.101.112",
  p256: "1.2.840.10045.3.1.7",
  p384: "1.3.132.0.34",
  p521: "1.3.132.0.35",
  ecdsaSha256: "1.2.840.10045.4.3.2",
  ecdsaSha384: "1.2.840.10045.4.3.3",
  ecdsaSha512: "1.2.840.10045.4.3.4",
  subjectAltName: "2.5.29.17",
  basicConstraints: "2.5.29.19",
};
export { OID };

export function parseCertificate(der: Uint8Array): X509 {
  const cert = parseDer(der);
  const tbs = child(cert, 0, "tbsCertificate");
  const sigAlg = child(cert, 1, "signatureAlgorithm");
  const sigVal = child(cert, 2, "signatureValue");

  // tbsCertificate: [0] version?, serial, signature, issuer, validity, subject, spki, [3] extensions?
  let i = 0;
  if (child(tbs, 0).cls === 2 && child(tbs, 0).tagNumber === 0) i = 1; // version
  const issuer = child(tbs, i + 2, "issuer");
  const validity = child(tbs, i + 3, "validity");
  const subject = child(tbs, i + 4, "subject");
  const spki = child(tbs, i + 5, "subjectPublicKeyInfo");

  const spkiAlg = child(spki, 0);
  const publicKeyAlgorithm = oidToString(child(spkiAlg, 0).bytes);
  const namedCurve = spkiAlg.children?.[1]?.tagNumber === 0x06 ? oidToString(spkiAlg.children[1].bytes) : undefined;

  const extensions = new Map<string, Uint8Array>();
  const sanUris: string[] = [];
  let isCA = false;
  const extWrap = tbs.children?.find((c) => c.cls === 2 && c.tagNumber === 3);
  if (extWrap) {
    for (const ext of child(extWrap, 0).children ?? []) {
      const oid = oidToString(child(ext, 0).bytes);
      // critical(BOOLEAN)が挟まることがある。extnValue は最後の OCTET STRING
      const value = child(ext, (ext.children?.length ?? 1) - 1).bytes;
      extensions.set(oid, value);
      if (oid === OID.subjectAltName) {
        for (const name of parseDer(value).children ?? []) {
          if (name.cls === 2 && name.tagNumber === 6) sanUris.push(new TextDecoder().decode(name.bytes)); // [6] URI
        }
      } else if (oid === OID.basicConstraints) {
        const bc = parseDer(value);
        isCA = !!bc.children?.find((c) => c.tagNumber === 0x01 && c.bytes[0] !== 0);
      }
    }
  }

  return {
    raw: der,
    tbs: tbs.raw,
    signatureAlgorithm: oidToString(child(sigAlg, 0).bytes),
    signature: sigVal.bytes.subarray(1),
    spki: spki.raw,
    publicKeyAlgorithm,
    namedCurve,
    notBefore: derTime(child(validity, 0)),
    notAfter: derTime(child(validity, 1)),
    sanUris,
    isCA,
    extensions,
    subjectRaw: subject.raw,
    issuerRaw: issuer.raw,
  };
}

/** 拡張の中身が DER の UTF8String / IA5String なら文字列に(Fulcio の v2 OID はそう) */
export function extensionString(cert: X509, oid: string): string | undefined {
  const v = cert.extensions.get(oid);
  if (!v) return undefined;
  try {
    const n = parseDer(v);
    if (n.tagNumber === 0x0c || n.tagNumber === 0x16) return new TextDecoder().decode(n.bytes);
  } catch {
    // v1 の OID は生の文字列
  }
  return new TextDecoder().decode(v);
}

/** cert の公開鍵を WebCrypto の verify 用に */
export async function importCertPublicKey(cert: X509): Promise<{ key: CryptoKey; algorithm: AlgorithmIdentifier | EcdsaParams }> {
  if (cert.publicKeyAlgorithm === OID.ecPublicKey) {
    const curve = cert.namedCurve === OID.p384 ? "P-384" : cert.namedCurve === OID.p521 ? "P-521" : "P-256";
    const key = await crypto.subtle.importKey("spki", cert.spki as BufferSource, { name: "ECDSA", namedCurve: curve }, false, ["verify"]);
    return { key, algorithm: { name: "ECDSA", hash: "SHA-256" } };
  }
  if (cert.publicKeyAlgorithm === OID.ed25519) {
    const key = await crypto.subtle.importKey("spki", cert.spki as BufferSource, { name: "Ed25519" }, false, ["verify"]);
    return { key, algorithm: { name: "Ed25519" } };
  }
  throw new Error(`unsupported public key algorithm ${cert.publicKeyAlgorithm}`);
}

/** 「child の署名を issuer の鍵で確かめる」 */
export async function verifyCertSignature(childCert: X509, issuer: X509): Promise<boolean> {
  const { key } = await importCertPublicKey(issuer);
  const hash = childCert.signatureAlgorithm === OID.ecdsaSha384 ? "SHA-384" : childCert.signatureAlgorithm === OID.ecdsaSha512 ? "SHA-512" : "SHA-256";
  if (issuer.publicKeyAlgorithm === OID.ed25519) {
    return crypto.subtle.verify({ name: "Ed25519" }, key, childCert.signature as BufferSource, childCert.tbs as BufferSource);
  }
  // X.509 の ECDSA 署名は DER(SEQUENCE of r, s)。WebCrypto は r||s の生の形
  const raw = ecdsaDerToRaw(childCert.signature, issuer.namedCurve);
  return crypto.subtle.verify({ name: "ECDSA", hash }, key, raw as BufferSource, childCert.tbs as BufferSource);
}

/** ECDSA の DER 署名(SEQUENCE { r INTEGER, s INTEGER })→ r||s(曲線の幅に左 0 詰め) */
export function ecdsaDerToRaw(der: Uint8Array, curveOid?: string): Uint8Array {
  const size = curveOid === OID.p384 ? 48 : curveOid === OID.p521 ? 66 : 32;
  const seq = parseDer(der);
  const r = child(seq, 0).bytes;
  const s = child(seq, 1).bytes;
  const out = new Uint8Array(size * 2);
  const put = (v: Uint8Array, at: number) => {
    let x = v;
    while (x.length > size && x[0] === 0) x = x.subarray(1);
    if (x.length > size) throw new Error("ECDSA: integer too long");
    out.set(x, at + size - x.length);
  };
  put(r, 0);
  put(s, size);
  return out;
}

export function sameCert(a: X509, b: X509): boolean {
  return bytesEqual(a.raw, b.raw);
}

export function isSequence(n: DerNode): boolean {
  return n.tag === 0x30;
}
