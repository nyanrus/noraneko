import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    sourcemap: true,
    reportCompressedSize: false,
    minify: false,
    outDir: "../../../dist/notes",
    rollupOptions: {
      output: {
        esModule: true,
        entryFileNames: "[name].js",
        assetFileNames: (chunk) => {
          return `assets/${chunk.name ?? ""}`;
        },
        chunkFileNames: (chunk) => {
          return `assets/${chunk.name}.js`;
        },
      },
    },
  },
});
