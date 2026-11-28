// Exact gzipped bytes per bundle fixture, current tree vs tmp/bundle-base
// (left by `pnpm bundle-compare main`). Build packages/effect first.
// Usage: node hill-climb-tools/bundle-bytes.ts [fixture-name-substring ...]
import * as path from "node:path"
import { readdirSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { rollup } from "../packages/tools/bundle/node_modules/rollup/dist/es/rollup.js"
import { createPlugins } from "../packages/tools/bundle/src/Plugins.ts"

const root = path.resolve(import.meta.dirname, "..")
const filters = process.argv.slice(2)
const size = async (input: string) => {
  const bundle = await rollup({ input, plugins: createPlugins(path as any), onwarn: () => {} })
  const { output } = await bundle.generate({ format: "esm" })
  await bundle.close()
  return output.reduce((n, c) => n + (c.type === "chunk" ? gzipSync(c.code, { level: 9 }).length : 0), 0)
}
const dir = "packages/tools/bundle/fixtures"
const names = readdirSync(path.join(root, dir)).filter((f) => f.endsWith(".ts") && (filters.length === 0 || filters.some((s) => f.includes(s))))
let total = 0
for (const name of names) {
  const [cur, base] = await Promise.all([size(path.join(root, dir, name)), size(path.join(root, "tmp/bundle-base", dir, name))])
  total += cur - base
  console.log(`${name.padEnd(40)} ${cur} ${base} ${cur - base > 0 ? "+" : ""}${cur - base}`)
}
console.log("total", total)
