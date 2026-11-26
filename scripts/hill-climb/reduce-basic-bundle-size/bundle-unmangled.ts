// Writes the minified but unmangled Rollup output for one entry, so declarations keep readable names
// (input for attribution.mjs). Build first: Effect packages resolve from their dist output.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/bundle-unmangled.ts <entry.ts> <out.js>
import type * as Path from "effect/Path"
import { writeFileSync } from "node:fs"
import * as NodePath from "node:path"
import { rollup } from "rollup"
import { createPlugins } from "../../../packages/tools/bundle/src/Plugins.ts"

const [entry, out] = process.argv.slice(2)
const pathService = NodePath as unknown as Path.Path
const bundle = await rollup({ input: entry, plugins: createPlugins(pathService, { mangle: false }), onwarn: () => {} })
const { output } = await bundle.generate({ format: "esm" })
await bundle.close()
writeFileSync(out, output.flatMap((chunk) => chunk.type === "chunk" ? [chunk.code] : []).join(""))
