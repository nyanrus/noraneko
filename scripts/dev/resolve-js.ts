import fs from 'node:fs/promises'
import { createPluginResolveDeps } from './babel-plugin-resolve-deps';
import path from 'node:path';
import solidRefresh from "solid-refresh/babel";
import * as babel from "@babel/core";
// @ts-ignore
import solid from "babel-preset-solid";
// @ts-ignore
import typescript from "@babel/preset-typescript";
import { CWD, NORANEKO_CONTENT_BASE_URL, SRC_DIR } from './utils';

export const compileSrcJs = async (filePath: string) => {
  const file = await fs.readFile(filePath, {
    encoding: "utf-8",
  });

  const { pluginResolveDeps, haveToBundle } =
    createPluginResolveDeps(filePath);
  const transformed = await babel.transformAsync(file, {
    plugins: [[solidRefresh, { bundler: "vite" }], [pluginResolveDeps]],
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
