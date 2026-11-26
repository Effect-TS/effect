// Approximate gzip attribution per top-level declarator in a minified bundle.
// usage: node attribution.mjs <bundle.js> [limit]
// Removes each top-level declaration in turn and reports how many gzipped bytes it saves.
// Run it on an unmangled bundle (bundle-analyze's <name>.min.js) to get readable names.
import { readFileSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { parseAst } from "rollup/parseAst"
const file = process.argv[2]
const top = Number(process.argv[3] ?? 40)
const code = readFileSync(file, "utf8")
const size = (s) => gzipSync(s, { level: 9 }).length
const total = size(code)
const ast = parseAst(code)
const items = []
for (const node of ast.body) {
  if (node.type === "VariableDeclaration" && node.declarations.length > 1) {
    for (const d of node.declarations) items.push({ name: d.id.name ?? "?", start: d.start, end: d.end })
  } else {
    const name = node.id?.name ?? node.declarations?.[0]?.id?.name ?? node.type
    items.push({ name, start: node.start, end: node.end })
  }
}
const rows = items.map((it) => ({
  name: it.name,
  raw: it.end - it.start,
  gzip: total - size(code.slice(0, it.start) + code.slice(it.end))
})).sort((a, b) => b.gzip - a.gzip)
console.log("total gzip", total)
for (const r of rows.slice(0, top)) console.log(String(r.gzip).padStart(6), String(r.raw).padStart(6), r.name)
