import puppeteer from "puppeteer-core";
import viteConfig from "./vite.config";
import { injectManifest } from "./scripts/inject/manifest";
import path from "path";
import fs from 'fs/promises'
import fg from 'fast-glob'
import { Buffer } from "buffer";
import solidRefresh from 'solid-refresh/babel'
import * as babel from '@babel/core'
// @ts-ignore
import solid from 'babel-preset-solid'
import swc from '@swc/core'
// @ts-ignore
import typescript from '@babel/preset-typescript'
import esbuild from 'esbuild'
import packageJson from './package.json'
import { existsSync } from "fs";
import { Server } from 'ws'
import { createServer } from 'http';

const JS_CONTENT_MAP: Record<string, string> = {
  'injectBrowser.inc.js': 'content/browser/index.ts',
  'injectPreferences.inc.js': 'content/preferences/index.ts'
}

const NORANEKO_CONTENT_BASE_URL = new URL('chrome://noraneko/content/')
const NORANEKO_CONTENT_BASE_PATH = './dist/noraneko/content'

const DEPS_DIR = path.join(NORANEKO_CONTENT_BASE_PATH, '.deps')
const DEPS_DIR_URL = new URL('.deps', NORANEKO_CONTENT_BASE_URL.href)

const SRC_DIR = path.join(NORANEKO_CONTENT_BASE_PATH, 'src')
const SRC_DIR_URL = new URL('src', NORANEKO_CONTENT_BASE_URL.href)

const CWD = process.cwd()

const createPluginNoranekoResolveDeps = () => {
  const promises: Promise<void>[] = []
  return {
    pluginNoranekoResolveDeps: (): babel.PluginObj => ({
      visitor: {
        ImportDeclaration (nodePath) {
          const source = nodePath.node.source.value
          const createDeps = !source.startsWith('.') && !source.startsWith('chrome://')

          if (!createDeps) {
            return
          }

          const postSource = `${source}/index.js`

          const distFile = path.join(DEPS_DIR, postSource)
          const postSourceUrl = new URL(`.deps/${postSource}`, DEPS_DIR_URL.href).href

          nodePath.node.source.value = postSourceUrl

          if (!existsSync(distFile)) {
            // Bundle Deps
            promises.push((async () => {
              await esbuild.build({
                entryPoints: [source],
                tsconfig: './tsconfig.json',
                outfile: distFile,
                bundle: true,
                format: 'esm',
                target: 'firefox115'
              })
            })())
          }
        }
      }
    }),
    successPromise: () => Promise.all(promises)
  }
}


const compileSrcJs = async (filePath: string) => {
  const file = await fs.readFile(filePath, {
    encoding: 'utf-8'
  })

  const { pluginNoranekoResolveDeps, successPromise } = createPluginNoranekoResolveDeps()
  const transformed = await babel.transformAsync(file, {
    plugins: [
      [solidRefresh, { bundler: 'esm' }],
      [pluginNoranekoResolveDeps]
    ],
    presets: [
      [solid],
      [typescript]
    ],
    filename: filePath
  })

  await successPromise()

  const pathToWrite = path.join(
    SRC_DIR,
    path.relative(path.join(CWD, 'src'), filePath)
  )

  try {
    await fs.mkdir(path.dirname(pathToWrite), { recursive: true })
  } catch (e) {}

  await fs.writeFile(pathToWrite, transformed?.code || '')
}
const launchDevServer = async () => {
  try {
    await fs.mkdir(DEPS_DIR)
  } catch (e) {}
  await compileSrcJs('src/content/browser/testButton.tsx')

  await fs.writeFile(path.join(NORANEKO_CONTENT_BASE_PATH, 'start.js'), `
  export const start = async (path) => {
    const ws = new WebSocket('ws://localhost:8080')
    ws.onopen = () => {
      import.meta.hot = {
        //wip
      }
      console.debug('[noraneko] connected')
      await import(path)
    }
  }
  `)
  for (const [filePath, from] of Object.entries(JS_CONTENT_MAP)) {
    await fs.writeFile(path.join(NORANEKO_CONTENT_BASE_PATH, filePath), `
      import('./start.js')
        .then(start => {
          start.start('./src/${from}')
        })
    `)
  }

  console.log('✅ Pre-Compiled!')

  const server = new Server({
    port: 8080
  })
  server.on('connection', ws => {
    console.log('ws')
  })
  console.log('✅ WebSocket Server has been started!')

}

const binPath = './dist/bin/firefox copy.exe'

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
  console.log('✅ Browser started')
}

async function main () {
  //await launchPupetter()
  await launchDevServer()
}
main()