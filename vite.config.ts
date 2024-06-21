import path from "node:path";
import type { UserConfig } from "vite"
import tsconfigPaths from 'vite-tsconfig-paths'
import solidPlugin from 'vite-plugin-solid'

const r = (dir: string) => {
  return path.resolve(import.meta.dirname, dir);
};
export default {
  root: r("src"),
  publicDir: r("src/public"),
  build: {
    sourcemap: true,
    reportCompressedSize: false,
    minify: false,
    cssMinify: false,
    emptyOutDir: true,
    assetsInlineLimit: 0,
    modulePreload: false,

    rollupOptions: {
      //https://github.com/vitejs/vite/discussions/14454
      preserveEntrySignatures: "allow-extension",
      input: {
        //index: "src/content/index.ts",
        startupBrowser: "src/components/startup/browser/index.ts",
        startupPreferences: "src/components/startup/preferences/index.ts",
      },
      output: {
        esModule: true,
        entryFileNames: "content/[name].js",
      },
    },
    outDir: r("dist/noraneko"),

    assetsDir: "content/assets",
  },
  css: {
    transformer: "lightningcss",
  },

  plugins: [
    tsconfigPaths(),

    solidPlugin({
      solid: {
        generate: "universal",
        moduleName: path.resolve(
          import.meta.dirname,
          "./src/components/solid-xul/solid-xul.ts",
        ),
      },
    }),
  ],
  resolve: {
    alias: [{ find: "@content", replacement: r("src/content") }],
  },
} satisfies UserConfig
