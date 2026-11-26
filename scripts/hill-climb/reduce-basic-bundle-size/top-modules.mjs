// Ranks the modules in a bundle-analyze raw-data.json by rendered and gzipped size.
// usage: node top-modules.mjs <name.raw-data.json> [limit]
import { readFileSync } from "node:fs"

const [file, limitArg] = process.argv.slice(2)
const limit = Number(limitArg ?? 25)
const data = JSON.parse(readFileSync(file, "utf8"))
const rows = Object.values(data.nodeParts).map((part) => ({
  module: data.nodeMetas[part.metaUid].id.replace(/^.*?\/packages\//, "packages/"),
  rendered: part.renderedLength,
  gzip: part.gzipLength
}))
const total = rows.reduce((acc, row) => ({ rendered: acc.rendered + row.rendered, gzip: acc.gzip + row.gzip }), {
  rendered: 0,
  gzip: 0
})
const table = (title, key) => {
  console.log(`### Top modules by ${title}\n`)
  console.log("| # | Module | Rendered (B) | Gzip (B, per module) |")
  console.log("|--:|:-------|-------------:|---------------------:|")
  rows.toSorted((a, b) => b[key] - a[key]).slice(0, limit).forEach((row, i) =>
    console.log(`| ${i + 1} | \`${row.module}\` | ${row.rendered} | ${row.gzip} |`)
  )
  console.log()
}
console.log(`Modules: ${rows.length}, rendered total: ${total.rendered} B, per-module gzip total: ${total.gzip} B\n`)
table("rendered size", "rendered")
table("gzipped size", "gzip")
