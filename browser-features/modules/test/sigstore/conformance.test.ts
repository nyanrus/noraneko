// SPDX-License-Identifier: MPL-2.0
// ブラウザで使う verifier(@freedomofpress/sigstore-browser)を sigstore-conformance の bundle-verify に食わせる。
//   deno test -A --no-check browser-features/modules/test/sigstore/
// dir 名が _fail で終わるものは落ちるべき、それ以外は通るべき。鍵つき(key.pub)は keyless でないので飛ばす。
// 既知の三つ(library の側の edge)は KNOWN に書いて飛ばす。増えたら気づけるように、飛ばす理由も残す。
import { SigstoreVerifier } from "@freedomofpress/sigstore-browser";

const here = new URL(".", import.meta.url);
const fixtures = new URL("bundle-verify/", here);
const pinned = JSON.parse(await Deno.readTextFile(new URL("../../modules/sigstore/trusted_root.json", here)));
const DEFAULT_IDENTITY = "https://github.com/sigstore-conformance/extremely-dangerous-public-oidc-beacon/.github/workflows/extremely-dangerous-oidc-beacon.yml@refs/heads/main";
const DEFAULT_ISSUER = "https://token.actions.githubusercontent.com";
const KNOWN: Record<string, string> = {
  "rekor2-dsse-happy-path": "DSSE + Rekor v2 は library 未対応(drops は messageSignature なので困らない)",
  "trust-root-tlog-missing-validity-start_fail": "validFor.start 無しの tlog を library が許す(edge)",
  "trust-root-tlog-validity-end-inclusive": "validFor.end ちょうどの log id 照合(edge)",
};

async function readOpt(dir: URL, name: string): Promise<string | undefined> {
  try {
    return (await Deno.readTextFile(new URL(name, dir))).trim();
  } catch {
    return undefined;
  }
}
const dirs: string[] = [];
for await (const d of Deno.readDir(fixtures)) if (d.isDirectory) dirs.push(d.name);
dirs.sort();

for (const name of dirs) {
  const dir = new URL(`${name}/`, fixtures);
  const bundleText = await readOpt(dir, "bundle.sigstore.json");
  if (bundleText === undefined) continue;
  const expectFail = name.endsWith("_fail");
  const keyed = (await readOpt(dir, "key.pub")) !== undefined;
  Deno.test({
    name: `bundle-verify/${name}${KNOWN[name] ? ` (skip: ${KNOWN[name]})` : ""}`,
    ignore: keyed || !!KNOWN[name],
    async fn() {
      let bundle: unknown;
      try {
        bundle = JSON.parse(bundleText);
      } catch {
        if (expectFail) return;
        throw new Error("bundle is not JSON");
      }
      const artifact = await Deno.readFile((await readOpt(dir, "artifact")) !== undefined ? new URL("artifact", dir) : new URL("a.txt", fixtures));
      const rootText = await readOpt(dir, "trusted_root.json");
      const v = new SigstoreVerifier();
      await v.loadSigstoreRoot(rootText ? JSON.parse(rootText) : pinned);
      let ok = false;
      let reason = "";
      try {
        ok = await v.verifyArtifact((await readOpt(dir, "identity")) ?? DEFAULT_IDENTITY, (await readOpt(dir, "issuer")) ?? DEFAULT_ISSUER, bundle as never, artifact, false);
      } catch (e) {
        reason = String(e).split("\n")[0];
      }
      if (expectFail && ok) throw new Error("should fail but ok");
      if (!expectFail && !ok) throw new Error(`should pass: ${reason}`);
    },
  });
}
