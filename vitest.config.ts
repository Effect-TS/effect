/// <reference types="vitest" />
import babel from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const babelConfig = require("./babel.config.json")

export default defineConfig({
  plugins: [babel({ babel: babelConfig })],
  test: {
    include: ["./test/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["./test/util.ts", "./test/utils/**/*.ts", "./test/**/*.init.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "effect-test": path.join(__dirname, "test"),
      "effect": path.join(__dirname, "src")
    }
  }
})
