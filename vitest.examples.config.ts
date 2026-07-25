import { globSync } from "glob"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const runner = fileURLToPath(new URL("./packages/tools/docgen/src/ExampleRunner.ts", import.meta.url))
const packageRoots = new Set(
  globSync("packages/**/examples/*.ts", {
    absolute: true,
    cwd: import.meta.dirname,
    ignore: ["**/node_modules/**"]
  }).map((file) => dirname(dirname(file)))
)
const projects = globalThis.Array.from(packageRoots).sort().map((root) => ({
  test: {
    name: root.slice(import.meta.dirname.length + 1),
    root,
    include: ["examples/*.ts"],
    exclude: [],
    runner,
    environment: "node",
    coverage: { enabled: false },
    isolate: false,
    fileParallelism: false,
    maxWorkers: 1,
    maxConcurrency: 1,
    sequence: { concurrent: false, shuffle: false }
  }
}))

export default defineConfig({
  root: import.meta.dirname,
  test: {
    coverage: { enabled: false },
    fileParallelism: false,
    maxWorkers: 1,
    projects
  }
})
