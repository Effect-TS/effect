// Writes the minified, mangled Rollup output for one entry and prints its gzipped size.
// The plugins are the ones the bundle report uses, so the size matches `report` and
// `compare-selected`. Build first: Effect packages resolve from their dist output.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/bundle-mangled.ts <entry.ts> <out.js>
import * as NodePath from "node:path"
import { writeFileSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { rollup } from "rollup"
import type * as Path from "effect/Path"
import { createPlugins } from "../../../packages/tools/bundle/src/Plugins.ts"

const [entry, out] = process.argv.slice(2)
const pathService = NodePath as unknown as Path.Path
const bundle = await rollup({ input: entry, plugins: createPlugins(pathService), onwarn: () => {} })
const { output } = await bundle.generate({ format: "esm" })
await bundle.close()
const code = output.flatMap((chunk) => chunk.type === "chunk" ? [chunk.code] : []).join("")
writeFileSync(out, code)
console.log("gzip", gzipSync(code, { level: 9 }).length)
