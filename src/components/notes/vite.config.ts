import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: "./",
  root: "./src/components/notes/src",
  plugins: [react()],
  build: {
    emptyOutDir: true,
    sourcemap: true,
    reportCompressedSize: false,
    minify: false,
    outDir: "../../../../dist/noraneko/content/components/notes",
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
