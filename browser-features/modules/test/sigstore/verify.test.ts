// SPDX-License-Identifier: MPL-2.0
// sigstore-conformance の bundle-verify を verify.ts に食わせる。
//   deno test -A browser-features/modules/test/sigstore/
// dir 名が _fail で終わるものは落ちるべき、それ以外は通るべき。DSSE(in-toto)は未対応なので飛ばす。
import { verifyBundle, type TrustedRoot } from "../../modules/sigstore/verify.ts";

const here = new URL(".", import.meta.url);
const fixtures = new URL("bundle-verify/", here);
const pinnedRoot = JSON.parse(await Deno.readTextFile(new URL("../../modules/sigstore/trusted_root.json", here))) as TrustedRoot;
const DEFAULT_IDENTITY = "https://github.com/sigstore-conformance/extremely-dangerous-public-oidc-beacon/.github/workflows/extremely-dangerous-oidc-beacon.yml@refs/heads/main";
const DEFAULT_ISSUER = "https://token.actions.githubusercontent.com";

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
  const dsse = /intoto|dsse/.test(name);
  const keyed = (await readOpt(dir, "key.pub")) !== undefined;
  // ブラウザの verifier の範囲外(registry が @sigstore/verify で見る): Rekor v2、TSA、SCT、RSA の CA
  const outOfScope = /^rekor2-|tsa|sct|ct-key/.test(name);
  Deno.test({
    name: `bundle-verify/${name}`,
    ignore: (dsse && !expectFail) || keyed || outOfScope, // DSSE の happy path、鍵つき、範囲外は対象外
    async fn() {
      let bundle: unknown;
      try {
        bundle = JSON.parse(bundleText);
      } catch {
        if (expectFail) return;
        throw new Error("bundle is not JSON");
      }
      const artifactUrl = (await readOpt(dir, "artifact")) !== undefined ? new URL("artifact", dir) : new URL("a.txt", fixtures);
      const artifact = await Deno.readFile(artifactUrl);
      const rootText = await readOpt(dir, "trusted_root.json");
      const root = rootText ? (JSON.parse(rootText) as TrustedRoot) : pinnedRoot;
      const r = await verifyBundle(bundle, root, {
        identity: (await readOpt(dir, "identity")) ?? DEFAULT_IDENTITY,
        issuer: (await readOpt(dir, "issuer")) ?? DEFAULT_ISSUER,
        artifact,
      });
      if (expectFail && r.ok) throw new Error(`should fail but ok (checked: ${r.checked.join(", ")})`);
      if (!expectFail && !r.ok) throw new Error(`should pass: ${r.reason} (checked: ${r.checked.join(", ")})`);
    },
  });
}
