import { defineConfig } from "@rstest/core"
import * as path from "node:path"

export default defineConfig({
  include: ["test/**/*.test.ts"],
  resolve: {
    alias: {
      "@effect/rstest/utils": path.join(import.meta.dirname, "src/utils.ts"),
      "@effect/rstest": path.join(import.meta.dirname, "src/index.ts")
    }
  }
})
