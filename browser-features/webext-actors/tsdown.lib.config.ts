// SPDX-License-Identifier: MPL-2.0

// Bundles a lib drop's lib/index.ts into _dist/lib/lib.js: an IIFE that binds
// nora_dep_<name> in the scope it is loaded into (child.sys.mjs loads it into a
// dependent's content scope before content.js). Its own deps stay external,
// bound the same way. preact comes from its source, like the content bundle.

import { defineConfig } from "tsdown";
import { dirname, fromFileUrl, join } from "@std/path";
import { existsSync } from "node:fs";

const drop = JSON.parse(Deno.readTextFileSync(new URL("./drop.json", import.meta.url)));
const depGlobal = (name: string) => "nora_dep_" + name.replace(/[^a-z0-9]/gi, "_");
const deps: { name: string }[] = drop.deps ?? [];

const pkg = (name: string) => {
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

export default defineConfig({
  entry: { "lib/lib": "lib/index.ts" },
  outDir: "_dist",
  format: "iife",
  globalName: depGlobal(drop.name),
  target: "esnext",
  platform: "browser",
  clean: false,
  minify: false,
  alias,
  // a dep and its jsx-runtime (jsxImportSource) both live in the dep's scope name
  external: deps.flatMap((d) => [d.name, `${d.name}/jsx-runtime`]),
  outputOptions: {
    entryFileNames: "[name].js",
    codeSplitting: false,
    globals: Object.fromEntries(deps.flatMap((d) => [[d.name, depGlobal(d.name)], [`${d.name}/jsx-runtime`, depGlobal(d.name)]])),
  },
});
