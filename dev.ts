import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs/promises";
import fg from "fast-glob";
import solidRefresh from "solid-refresh/babel";
import * as babel from "@babel/core";
// @ts-ignore
import solid from "babel-preset-solid";
// @ts-ignore
import typescript from "@babel/preset-typescript";
import esbuild from "esbuild";
import {
  statSync,
} from "node:fs";
import { Server } from "ws";
import tsconfig from "./tsconfig.json";
import chokidar from 'chokidar'
import type { HotMessage } from "./src/dev-modules/types";

const JS_CONTENT_MAP: Record<string, string> = {
  "injectBrowser.inc.js": "content/browser/index.ts",
  "injectPreferences.inc.js": "content/preferences/index.ts",
};

const NORANEKO_CONTENT_BASE_URL = new URL("chrome://noraneko/content/");
const NORANEKO_CONTENT_BASE_PATH = "./dist/noraneko/content";

const DEPS_DIR = path.join(NORANEKO_CONTENT_BASE_PATH, "deps");
const DEPS_DIR_URL = new URL("deps", NORANEKO_CONTENT_BASE_URL.href);

const SRC_DIR = path.join(NORANEKO_CONTENT_BASE_PATH, "src");
const SRC_DIR_URL = new URL("src", NORANEKO_CONTENT_BASE_URL.href);

const CWD = process.cwd();

const ALL_RESOLVE_FILE_ENDS: string[] = [
  "",
  "/index.ts",
  "/index.tsx",
  ".ts",
  ".tsx",
];

const existsFile = (fp: string) => {
  try {
    const stat = statSync(fp);
    return stat.isFile();
  } catch {
    return false;
  }
};

type HaveToBundle = Record<string, {
  url: string
  dist: string
}>
const createPluginNoranekoResolveDeps = (filepath: string) => {
  const promises: Promise<void>[] = [];

  const haveToBundle: HaveToBundle = {}
  return {
    pluginNoranekoResolveDeps: (): babel.PluginObj => ({
      visitor: {
        ImportDeclaration(nodePath) {
          const source = nodePath.node.source.value;

          if (source.endsWith("?inline")) {
            // inline
            nodePath.node.source.value = `${
              source.replace(/\?inline$/, "")
            }${".inline.js"}`;
            promises.push(
              fs
                .readFile(
                  path.join(filepath, "..", source.replace(/\?inline$/, "")),
                  { encoding: "utf-8" },
                )
                .then(async (file) => {
                  const distPath = path.join(
                    NORANEKO_CONTENT_BASE_PATH,
                    filepath,
                    "..",
                    nodePath.node.source.value,
                  )
                  try {
                    await fs.mkdir(path.dirname(distPath), { recursive: true })
                  } catch {}
                  await fs.writeFile(
                    distPath,
                    `export default \`${
                      file.replaceAll(/[\\`]/g, (char) => `\\${char}`)
                    }\``,
                  );
                }),
            );
            return;
          }

          for (
            const [key, value] of Object.entries(tsconfig.compilerOptions.paths)
          ) {
            const keyStarting = key.replace(/\*$/, "");
            if (source.startsWith(keyStarting)) {
              for (const resolve of value) {
                const resolvedRelativePath = source.replace(
                  keyStarting,
                  resolve.replace(/\*$/, ""),
                );
                for (const resolveEnd of ALL_RESOLVE_FILE_ENDS) {
                  const resolved = resolvedRelativePath + resolveEnd;
                  if (existsFile(resolved)) {
                    nodePath.node.source.value =
                      new URL(`${resolved}.js?t=${Date.now()}`, NORANEKO_CONTENT_BASE_URL.href)
                        .href;
                    return;
                  }
                }
              }
              return
            }
          }
          if (source.startsWith(".")) {
            // Resolve relative import
            for (const resolveEnd of ALL_RESOLVE_FILE_ENDS) {
              const resolved = source + resolveEnd;
              const pathToFind = path.resolve(filepath, "..", resolved);
              if (existsFile(pathToFind)) {
                nodePath.node.source.value = `${resolved}.js?t=${Date.now()}`;
                return;
              }
            }
            throw new TypeError(`Couldn't resolve import ${source}`);
          }
          if (source.startsWith("chrome://")) {
            return;
          }

          const postSource = `${source.replaceAll("@", "at-")}/index.js`;

          const distFile = path.join(DEPS_DIR, postSource);
          const postSourceUrl = new URL(
            `deps/${postSource}`,
            DEPS_DIR_URL.href,
          ).href;

          nodePath.node.source.value = postSourceUrl;

          haveToBundle[source] = {
            dist: distFile.replaceAll("@", "at-"),
            url: postSourceUrl
          }
        },
      },
    }),
    haveToBundle
  };
};

const compileSrcJs = async (filePath: string) => {
  const file = await fs.readFile(filePath, {
    encoding: "utf-8",
  });

  const { pluginNoranekoResolveDeps, haveToBundle } =
    createPluginNoranekoResolveDeps(filePath);
  const transformed = await babel.transformAsync(file, {
    plugins: [[solidRefresh, { bundler: "vite" }], [pluginNoranekoResolveDeps]],
    presets: [[solid, {
      moduleName: 'chrome://noraneko/content/src/components/solid-xul/solid-xul.ts.js',
      generate: "universal",
    }], [typescript]],
    filename: filePath,
  });

  const url = new URL(filePath.replaceAll('\\', '/'), NORANEKO_CONTENT_BASE_URL.href)
  const code = `
  import { createHotContext as _$$createHotContext } from 'chrome://noraneko/content/start.js';
  import.meta.hot = _$$createHotContext(import.meta.url)
  ;${transformed?.code || ''}`

  const pathToWrite = path.join(
    SRC_DIR,
    path.relative(path.join(CWD, "src"), `${filePath}.js`),
  );

  try {
    await fs.mkdir(path.dirname(pathToWrite), { recursive: true });
  } catch (e) {}

  await fs.writeFile(pathToWrite, code);

  return haveToBundle
};
const launchDevServer = async () => {
  try {
    await fs.mkdir(DEPS_DIR);
  } catch (e) {}

  const haveToBundle: HaveToBundle = {}
  for await (
    const filePath of fg.stream([
      "./src/content/**/*.{ts,tsx}",
      "./src/components/**/*.{ts,tsx}",
      "./src/modules/**/*.{ts,tsx}",
    ])
  ) {
    const haveToBundleInThatJs = await compileSrcJs(filePath.toString());
    Object.assign(haveToBundle, haveToBundleInThatJs)
  }

  const bundleAliases = Object.fromEntries(Object.entries(haveToBundle).map(([name, { url }]) => [
    name,
    url
  ]))

  for (let [name, { dist }] of Object.entries(haveToBundle)) {
    const alias = {...bundleAliases}
    delete alias[name]

    if (name === 'solid-js') {
      name = './node_modules/solid-js/dist/dev.js'
    }
    await esbuild.build({
      entryPoints: [name],
      tsconfig: "./tsconfig.json",
      outfile: dist,
      bundle: true,
      format: "esm",
      target: "firefox115",
      plugins: [
        {
          name: 'internal-deps-resolver',
          setup(build) {
            build.onResolve({
              filter: /.+/
            }, (args) => {
              if (args.path in alias) {
                return {
                  path: alias[args.path],
                  external: true
                }
              }
              return {}
            })
          },
        }
      ]
    });
  }
  /*await Promise.all(Object.entries(haveToBundle).map(async ([name, { dist }]) => {
    try {
      await esbuild.build({
        entryPoints: [name],
        tsconfig: "./tsconfig.json",
        outfile: dist.replaceAll("@", "at-"),
        bundle: true,
        format: "esm",
        target: "firefox115",
        alias: bundleAliases
      });
    } catch (e) {
      console.warn(`⚠ Unable to bundle module: ${name}`);
    }
  }))*/
  //await compileSrcJs("src/content/preferences/index.ts");

  await fs.copyFile(
    "./src/dev-modules/start.js",
    path.join(NORANEKO_CONTENT_BASE_PATH, "start.js"),
  );
  for (const [filePath, from] of Object.entries(JS_CONTENT_MAP)) {
    await fs.writeFile(
      path.join(NORANEKO_CONTENT_BASE_PATH, filePath),
      `
      import('chrome://noraneko/content/src/${from}.js').then(mod => mod.default())
    `,
    );
  }

  console.info("✅ Pre-Compiled!");

  const server = new Server({
    port: 8080,
  });
  server.on("connection", (ws) => {
    console.debug("ws")
  });
  console.info("✅ WebSocket Server has been started!");

  // Watch
  chokidar.watch('src', {
    ignoreInitial: true
  })
    .on('all', async (evt, path) => {
      if (!existsFile(path)) {
        return
      }
      if (path.endsWith('.ts') || path.endsWith('.tsx')) {
        const started =  Date.now()
        let isThrowedSyntaxError = false
        try {
          await compileSrcJs(path)
        } catch (e) {
          isThrowedSyntaxError = true
          console.error(e)
        }
        const finished = Date.now()
        console.log(`Compiled at ${finished - started}ms: ${path}`)

        server.clients.forEach((client) => {
          client.send(JSON.stringify({
            distUrl: `${new URL(path.replaceAll('\\', '/'), NORANEKO_CONTENT_BASE_URL.href).href}.js`,
            syntaxError: isThrowedSyntaxError
          } satisfies HotMessage))
        })
      }
    })
};

const binPath = "./dist/bin/firefox copy.exe";

const launchPupetter = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    protocol: "webDriverBiDi",
    dumpio: true,
    product: "firefox",
    executablePath: binPath,
    userDataDir: "./dist/profile/test",
    extraPrefsFirefox: { "browser.newtabpage.enabled": true },
    defaultViewport: { height: 0, width: 0 },
  });
  console.log("✅ Browser started");
};

async function main() {
  //await launchPupetter()
  await launchDevServer();
}
main();
