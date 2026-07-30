import * as Examples from "@effect/doctest/Examples"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const packageRoot = fileURLToPath(new URL("./packages/effect", import.meta.url))

export default defineConfig({
  root: packageRoot,
  plugins: [Examples.vitestPlugin()],
  test: {
    include: ["src/**/*.ts"]
  }
})
