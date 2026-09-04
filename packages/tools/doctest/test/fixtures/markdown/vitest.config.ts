import * as Doctest from "@effect/doctest/Plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
  root: import.meta.dirname,
  plugins: [Doctest.plugin()],
  test: {
    watch: false,
    include: [],
    includeSource: process.env.DOCTEST_DIAGNOSTIC === "1"
      ? ["diagnostic.md"]
      : ["docs/typed.md", "docs/javascript.md", "src/typed.ts"],
    setupFiles: ["./setup.ts"],
    passWithNoTests: false,
    fileParallelism: false,
    maxWorkers: 1,
    retry: 0,
    reporters: ["default", "json"],
    outputFile: process.env.DOCTEST_RESULT ?? "result.json"
  }
})
