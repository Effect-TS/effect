/// <reference types="vitest" />
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  test: {
    include: ["./test/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["./test/util.ts", "./test/utils/**/*.ts", "./test/**/*.init.ts"],
    browser: {
      name: "chromium",
      provider: "playwright",
      headless: true
    },
    fakeTimers: { toFake: undefined }
  },
  resolve: {
    alias: {
      "effect-test": path.join(__dirname, "test"),
      "effect/impl": path.join(__dirname, "src"),
      "effect/internal": path.join(__dirname, "src", "internal"),
      "effect": path.join(__dirname, "src", "exports")
    }
  }
})
