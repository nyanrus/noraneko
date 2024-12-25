import {defineConfig} from "vitest/config"

export default defineConfig({
root: ".",
  test: {
    name: "Noraneko",
    pool: "./src/pool/index.ts",
    typecheck: {
      enabled: true
    }
  }
})