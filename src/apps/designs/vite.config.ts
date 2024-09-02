import { defineConfig } from "vite";

import { generateJarManifest } from "../common/scripts/gen_jarmanifest";

export default defineConfig({
  server: {
    port: 5182,
  },
  build: {
    outDir: "_dist",
    target: "firefox128",
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        designs: "./src/index.ts",
      },
    },
  },
  plugins: [
    {
      name: "gen_jarmn",
      enforce: "post",
      async generateBundle(options, bundle, isWrite) {
        this.emitFile({
          type: "asset",
          fileName: "jar.mn",
          needsCodeReference: false,
          source: await generateJarManifest(bundle, {
            prefix: "skin",
            namespace: "noraneko",
            register_type: "skin",
          }),
        });
        this.emitFile({
          type: "asset",
          fileName: "moz.build",
          needsCodeReference: false,
          source: `JAR_MANIFESTS += ["jar.mn"]`,
        });
      },
    },
  ],
});
