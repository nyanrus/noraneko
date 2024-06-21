import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs/promises";
import fg from "fast-glob";
import esbuild from "esbuild";
import { Server } from "ws";
import chokidar from 'chokidar'
import type { HotMessage } from "./src/dev-modules/types";
import { DEPS_DIR, existsFile, NORANEKO_CONTENT_BASE_PATH, NORANEKO_CONTENT_BASE_URL } from "./scripts/dev/utils";
import type { HaveToBundle } from "./scripts/dev/babel-plugin-resolve-deps";
import { compileSrcJs } from "./scripts/dev/resolve-js";

const JS_CONTENT_MAP: Record<string, string> = {
  "injectBrowser.inc.js": "content/browser/index.ts",
  "injectPreferences.inc.js": "content/preferences/index.ts",
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
