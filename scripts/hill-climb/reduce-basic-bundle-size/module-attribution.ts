// Gzip attribution per module and per named group of modules for one entry.
// For each module (and each group) it removes every top-level declaration the module
// contributes from the minified, unmangled bundle and reports the gzipped bytes saved.
// Groups answer "what does this dependency chain cost as a whole", which the per-declaration
// numbers of `attribution.mjs` cannot, because gzip shares context between neighbours.
// Build first: Effect packages resolve from their dist output.
// usage: node scripts/hill-climb/reduce-basic-bundle-size/module-attribution.ts <entry.ts> [group=mod1,mod2 ...]
//   e.g. protocol=dist/Equal.js,dist/Hash.js,dist/internal/equal.js,dist/Formatter.js,dist/Redactable.js
import type * as Path from "effect/Path"
import * as NodePath from "node:path"
import { gzipSync } from "node:zlib"
import { rollup } from "rollup"
import { parseAst } from "rollup/parseAst"
import { createPlugins } from "../../../packages/tools/bundle/src/Plugins.ts"

const [entry, ...groupArgs] = process.argv.slice(2)
const pathService = NodePath as unknown as Path.Path
const gzip = (code: string) => gzipSync(code, { level: 9 }).length

const topLevel = (code: string) => {
  const items: Array<{ name: string; start: number; end: number }> = []
  for (const node of parseAst(code).body as Array<any>) {
    if (node.type === "VariableDeclaration") {
      // A declarator cannot be cut out on its own without breaking `const a = 1, b = 2`,
      // so each one is replaced by an empty binding of the same name instead.
      for (const d of node.declarations) items.push({ name: d.id.name, start: d.start, end: d.end })
    } else if (node.id?.name) {
      items.push({ name: node.id.name, start: node.start, end: node.end })
    }
  }
  return items
}

// Unminified build: which top-level names does each module contribute?
const plain = await rollup({ input: entry, plugins: createPlugins(pathService, { minify: false }), onwarn: () => {} })
const plainOut = await plain.generate({ format: "esm" })
await plain.close()
const namesByModule = new Map<string, Array<string>>()
for (const chunk of plainOut.output) {
  if (chunk.type !== "chunk") continue
  for (const [id, module] of Object.entries(chunk.modules)) {
    if (module.renderedLength === 0 || !module.code) continue
    namesByModule.set(id.replace(/^.*?\/packages\//, "packages/"), topLevel(module.code).map((_) => _.name))
  }
}

// Minified but unmangled build: sizes are close to the report's, names still match.
const min = await rollup({ input: entry, plugins: createPlugins(pathService, { mangle: false }), onwarn: () => {} })
const minOut = await min.generate({ format: "esm" })
await min.close()
const code = minOut.output.flatMap((chunk) => chunk.type === "chunk" ? [chunk.code] : []).join("")
const declarations = topLevel(code)
const total = gzip(code)

const without = (names: ReadonlySet<string>) => {
  let out = ""
  let last = 0
  let raw = 0
  for (const d of declarations) {
    if (!names.has(d.name)) continue
    out += code.slice(last, d.start) + d.name
    raw += d.end - d.start
    last = d.end
  }
  return { gzip: total - gzip(out + code.slice(last)), raw }
}

const rows: Array<[label: string, gzip: number, raw: number]> = []
for (const [id, names] of namesByModule) {
  const r = without(new Set(names))
  rows.push([id, r.gzip, r.raw])
}
rows.sort((a, b) => b[1] - a[1])
console.log(`total gzip (unmangled) ${total}`)
console.log("\n| Module | gzip B | minified B |\n|---|---:|---:|")
for (const [label, g, raw] of rows) console.log(`| ${label} | ${g} | ${raw} |`)

if (groupArgs.length > 0) {
  console.log("\n| Group | gzip B | minified B |\n|---|---:|---:|")
  for (const arg of groupArgs) {
    const [label, list] = arg.split("=")
    const filters = list.split(",")
    const names = new Set<string>()
    for (const [id, moduleNames] of namesByModule) {
      if (filters.some((f) => id.endsWith(f))) for (const name of moduleNames) names.add(name)
    }
    const r = without(names)
    console.log(`| ${label} | ${r.gzip} | ${r.raw} |`)
  }
}
