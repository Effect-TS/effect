// Prints the code each module contributes to the unminified Rollup output for one entry,
// largest first. Use it to see exactly which declarations of a module survive tree-shaking.
// Build first: Effect packages resolve from their dist output.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/module-code.ts <entry.ts> [module-filter]
import type * as Path from "effect/Path"
import * as NodePath from "node:path"
import { rollup } from "rollup"
import { createPlugins } from "../../../packages/tools/bundle/src/Plugins.ts"

const [entry, filter] = process.argv.slice(2)
const pathService = NodePath as unknown as Path.Path
const bundle = await rollup({
  input: entry,
  plugins: createPlugins(pathService, { minify: false }),
  onwarn: () => {}
})
const { output } = await bundle.generate({ format: "esm" })
await bundle.close()
const modules = output.flatMap((chunk) => chunk.type === "chunk" ? Object.entries(chunk.modules) : [])
  .filter(([id, module]) => module.renderedLength > 0 && (filter === undefined || id.includes(filter)))
  .sort((a, b) => b[1].renderedLength - a[1].renderedLength)
for (const [id, module] of modules) {
  console.log(`// ===== ${id.replace(/^.*?\/packages\//, "packages/")} (${module.renderedLength} B)`)
  if (filter !== undefined) console.log(module.code)
}
