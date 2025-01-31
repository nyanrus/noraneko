import fs from "fs/promises"
import {relative} from "pathe"

import {build} from "tsdown"

let entry = []
for await (const x of fs.glob(import.meta.dirname + "/src/**/*.mts")) {
  entry.push(relative(import.meta.dirname,x));
}

let VERSION2 = null;
let BUILDID2 = null;
try {
  const settings = JSON.parse(process.argv.at(-1)!);
  VERSION2 = settings.version2;
  BUILDID2 = settings.buildid2;
} catch {}
await build({
  entry,
  external: /^resource:\/\/[\S]+/g,
  outDir: "_dist",
  outputOptions: {
    "entryFileNames": "[name].mjs"
  },
  define: {
    "import.meta.env.__VERSION2__": `"${VERSION2 ?? ""}"`,
    "import.meta.env.__BUILDID2__": `"${BUILDID2 ?? ""}"`
  }
});

import { generateJarManifest } from "../common/scripts/gen_jarmanifest.js";
import fg from "fast-glob";

const file_list = await fg("./_dist/**/*");
await fs.writeFile(
  "./_dist/jar.mn",
  await generateJarManifest(
    file_list.map((v) => {
      return { fileName: v.replace("./_dist/", "") };
    }),
    { namespace: "noraneko", register_type: "resource", prefix: "modules" },
  ),
);
await fs.writeFile("./_dist/moz.build", 'JAR_MANIFESTS += ["jar.mn"]');
