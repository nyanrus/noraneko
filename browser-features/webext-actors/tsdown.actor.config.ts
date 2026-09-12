// SPDX-License-Identifier: MPL-2.0

// Bundles one actor's actor.ts into _dist/<name>/actor.mjs (ESM, loaded by the
// generated api.js in the main process via ChromeUtils.importESModule). The
// target actor is passed by build.ts via the WEBEXT_ACTOR env var (one tsdown
// run per actor, so each bundle is self-contained / no code-splitting).
// birpc and content-only code are tree-shaken out: api.js only uses `parent`.

import { defineConfig } from "tsdown";
import process from "node:process";

const actor = process.env.WEBEXT_ACTOR;
if (!actor) {
  throw new Error("WEBEXT_ACTOR env var is required");
}

export default defineConfig({
  entry: { [`${actor}/actor`]: `_gen/${actor}/parent.entry.ts` },
  outDir: "_dist",
  format: "esm",
  target: "esnext",
  clean: false,
  // minify しない: xpi の中の JS を人が読めるままにする(drop は入れる本人が読む)
  minify: false,
  // 親には parent だけを残す。module 直下は純粋、という contract なので、副作用だけの
  // import(content 側の preact など。preact は sideEffects: false を書いていない)は落とす
  treeshake: { manualPureFunctions: ["defineParent", "defineContent"], moduleSideEffects: false },
  external: [/^resource:\/\//, /^chrome:\/\//],
  outputOptions: { entryFileNames: "[name].mjs", codeSplitting: false },
});
