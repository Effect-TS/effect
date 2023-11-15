import * as path from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  test: {
    include: ["test/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
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
