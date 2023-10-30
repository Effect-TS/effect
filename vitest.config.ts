/// <reference types="vitest" />
import babel from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelConfig = require("./.babel.mjs.json")

export default defineConfig({
  plugins: [babel({ babel: babelConfig })],
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
      "effect": path.join(__dirname, "src")
    }
  }
})
