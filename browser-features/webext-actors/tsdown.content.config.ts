// SPDX-License-Identifier: MPL-2.0

// Bundles one actor's generated content entry into _dist/<name>/content.js
// (IIFE content script). The target actor is passed by build.ts via the
// WEBEXT_ACTOR env var (one run per actor). birpc and the shared content
// runtime are inlined; the parent methods are tree-shaken out.

import { defineConfig } from "tsdown";
import process from "node:process";
import { dirname, fromFileUrl, join } from "@std/path";
import { existsSync } from "node:fs";

// npm の preact は dist が minify 済(一行が 400 字を超えて、xpi の「読める形」の
// 検査に引っかかる)。同梱するのは src のほう。exports に src は無いので、
// package.json の実パスから辿って alias で指す。
const pkg = (name: string) => {
  // main の実パスから、その package の package.json がある dir まで上がる
  // (node_modules でも deno の cache でも同じ形で辿れる)
  let dir = dirname(fromFileUrl(import.meta.resolve(`npm:${name}`)));
  while (!existsSync(join(dir, "package.json")) || JSON.parse(Deno.readTextFileSync(join(dir, "package.json"))).name !== name) {
    const up = dirname(dir);
    if (up === dir) throw new Error(`package dir not found for ${name}`);
    dir = up;
  }
  return dir;
};
const preact = pkg("preact");
const alias = {
  "preact/hooks": join(preact, "hooks/src/index.js"),
  "preact/jsx-runtime": join(preact, "jsx-runtime/src/index.js"),
  preact: join(preact, "src/index.js"),
  "@preact/signals-core": join(pkg("@preact/signals-core"), "src/index.ts"),
};

const actor = process.env.WEBEXT_ACTOR;
if (!actor) {
  throw new Error("WEBEXT_ACTOR env var is required");
}

// deps (drop.json, written by the registry's build.rb) stay outside the bundle:
// their lib.js is loaded into the same scope first and binds nora_dep_<name>
let deps: { name: string }[] = [];
try {
  deps = JSON.parse(Deno.readTextFileSync(new URL("./drop.json", import.meta.url))).deps ?? [];
} catch {
  // built-ins have no deps
}
const depGlobal = (name: string) => "nora_dep_" + name.replace(/[^a-z0-9]/gi, "_");
const globals = Object.fromEntries(deps.flatMap((d) => [[d.name, depGlobal(d.name)], [`${d.name}/jsx-runtime`, depGlobal(d.name)]]));

export default defineConfig({
  entry: { [`${actor}/content`]: `_gen/${actor}/content.entry.ts` },
  outDir: "_dist",
  format: "iife",
  target: "esnext",
  platform: "browser",
  clean: false,
  // minify しない: xpi の中の JS を人が読めるままにする(drop は入れる本人が読む)
  minify: false,
  alias,
  // a dep and its jsx-runtime (jsxImportSource) both live in the dep's scope name
  external: deps.flatMap((d) => [d.name, `${d.name}/jsx-runtime`]),
  treeshake: { manualPureFunctions: ["defineParent", "defineContent"] },
  outputOptions: { entryFileNames: "[name].js", codeSplitting: false, globals },
});
