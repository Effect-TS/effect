// Exact gzipped bytes per bundle fixture, current tree vs tmp/bundle-base
// (left by `pnpm bundle-compare main`). Build packages/effect first.
// Usage: node hill-climb-tools/bundle-bytes.ts [fixture-name-substring ...]
import { readdirSync } from "node:fs"
import * as path from "node:path"
import { gzipSync } from "node:zlib"
import { rollup } from "../packages/tools/bundle/node_modules/rollup/dist/es/rollup.js"
import { createPlugins } from "../packages/tools/bundle/src/Plugins.ts"

const root = path.resolve(import.meta.dirname, "..")
const filters = process.argv.slice(2)
const size = async (input: string) => {
  const bundle = await rollup({ input, plugins: createPlugins(path as any), onwarn: () => {} })
  const { output } = await bundle.generate({ format: "esm" })
  await bundle.close()
  let min = 0, gz = 0
  for (const c of output) {
    if (c.type === "chunk") {
      min += Buffer.byteLength(c.code)
      gz += gzipSync(c.code, { level: 9 }).length
    }
  }
  return [min, gz] as const
}
const dir = "packages/tools/bundle/fixtures"
const names = readdirSync(path.join(root, dir)).filter((f) =>
  f.endsWith(".ts") && (filters.length === 0 || filters.some((s) => f.includes(s)))
)
let tm = 0, tg = 0
console.log("| Fixture | Minified (branch) | Minified (main) | Δ min | Gzip (branch) | Gzip (main) | Δ gzip |")
console.log("|:--|--:|--:|--:|--:|--:|--:|")
for (const name of names) {
  const [[cm, cg], [bm, bg]] = await Promise.all([
    size(path.join(root, dir, name)),
    size(path.join(root, "tmp/bundle-base", dir, name))
  ])
  tm += cm - bm
  tg += cg - bg
  const d = (x: number) => (x > 0 ? "+" : "") + x
  console.log(`| \`${name}\` | ${cm} | ${bm} | ${d(cm - bm)} | ${cg} | ${bg} | ${d(cg - bg)} |`)
}
console.log(`| **total** | | | ${tm} | | | ${tg} |`)
