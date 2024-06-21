import fs from 'node:fs/promises'
import path from 'node:path'
import { CWD, DEPS_DIR, DEPS_DIR_URL, existsFile, NORANEKO_CONTENT_BASE_PATH, NORANEKO_CONTENT_BASE_URL } from './utils'
import packageJson from '../../package.json'
import tsconfig from '../../tsconfig.json'

const allInstalledPackages = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies
})

const ALL_RESOLVE_FILE_ENDS: string[] = [
  "",
  "/index.ts",
  "/index.tsx",
  ".ts",
  ".tsx",
];

export type HaveToBundle = Record<string, {
  url: string
  dist: string
}>

export const createPluginResolveDeps = (filepath: string) => {
  const promises: Promise<void>[] = [];

  const haveToBundle: HaveToBundle = {}
  return {
    pluginResolveDeps: (): babel.PluginObj => ({
      visitor: {
        ImportDeclaration(nodePath) {
          // importの処理

          /**
           * Import target
           */
          const source = nodePath.node.source.value.replace(/\?.+/, '');

          if (source.startsWith("chrome://")) {
            return;
          }
          const searchString = nodePath.node.source.value.match(/\?.+/)?.[0]
          const search = new URLSearchParams(searchString)

          // NPM MODULES
          for (const installedPackage of allInstalledPackages) {
            if (source.startsWith(installedPackage)) {
              // resolve npm module
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
              return
            }
          }

          let resolvedPath: string | null = null

          if (source.startsWith(".")) {
            // Resolve relative import
            for (const resolveEnd of ALL_RESOLVE_FILE_ENDS) {
              const resolved = source + resolveEnd;
              const pathToFind = path.resolve(filepath, "..", resolved);
              if (existsFile(pathToFind)) {
                resolvedPath = path.relative(CWD, pathToFind)
                break;
              }
            }
          } else {
            // Resolve tsconfig paths
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
                      resolvedPath = resolved
                    }
                  }
                }
              }
            }
          }
          if (!resolvedPath) {
            console.error(new TypeError(`Couldn't resolve import ${source}`))
            return
          }

          // いろいろなimport
          if (search.has('inline') || search.has('url')) {
            // inline
            nodePath.node.source.value = new URL(`${
              resolvedPath.replaceAll('\\', '/')
            }.${search.has('inline') ? 'inline' : 'url'}.js`, NORANEKO_CONTENT_BASE_URL.href).href;
            promises.push((async () => {
              const content = search.has('inline') ? await fs.readFile(resolvedPath, { encoding: "utf-8" }) : nodePath.node.source.value
              
              const distPath = `${path.join(
                NORANEKO_CONTENT_BASE_PATH,
                resolvedPath
              )}.${search.has('inline') ? 'inline' : 'url'}.js`
              try {
                await fs.mkdir(path.dirname(distPath), { recursive: true })
              } catch {}
              await fs.writeFile(
                distPath,
                `export default \`${
                  content.replaceAll(/[\\`]/g, (char) => `\\${char}`)
                }\``,
              );
            })());
            return;
          }
          // 通常のimport
          nodePath.node.source.value = new URL(`${
            resolvedPath.replaceAll('\\', '/')
          }.js`, NORANEKO_CONTENT_BASE_URL.href).href;
        },
      },
    }),
    haveToBundle
  };
};
