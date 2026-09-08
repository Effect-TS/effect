import { defineConfig } from "@rstest/core"
import * as path from "node:path"

export default defineConfig({
  include: ["test/**/*.test.ts"],
  source: {
    tsconfigPath: path.join(import.meta.dirname, "../../tsconfig.tests.json")
  }
})
