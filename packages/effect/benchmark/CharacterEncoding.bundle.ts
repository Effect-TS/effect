// Run from the repository root: node packages/effect/benchmark/CharacterEncoding.bundle.ts
import { strict as assert } from "node:assert"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { gzipSync } from "node:zlib"

const require = createRequire(import.meta.url)
// Reuse the build tools already installed by the workspace's Vite / Rollup plugins.
const esbuildRequire = createRequire(require.resolve("rollup-plugin-esbuild"))
const rolldownRequire = createRequire(require.resolve("vite/package.json"))
const esbuild = esbuildRequire("esbuild")
const rolldown = await import(rolldownRequire.resolve("rolldown"))
const root = process.cwd()
const cases = [
  {
    name: "utf8-only",
    source:
      "import { decodeUnsafe } from \"./src/encoding/Utf8.ts\"; export const decode = (bytes) => decodeUnsafe(bytes)",
    tables: 0
  },
  {
    name: "cp1251-only",
    source:
      "import { decodeUnsafe } from \"./src/encoding/Windows1251.ts\"; export const decode = (bytes) => decodeUnsafe(bytes)",
    tables: 1
  },
  {
    name: "restricted-registry",
    source:
      "import { makeRegistry } from \"./src/CharacterEncoding.ts\"; import { encoding as utf8, decodeUnsafe } from \"./src/encoding/Utf8.ts\"; import { encoding as cp1251 } from \"./src/encoding/Windows1251.ts\"; const registry = makeRegistry([utf8, cp1251]); export const decode = (bytes, label) => { const encoding = registry.resolveUnsafe(label); return encoding.name === 'utf8' ? decodeUnsafe(bytes) : decodeUnsafe(bytes) }",
    tables: 1
  },
  {
    name: "all-encodings",
    source:
      "import { resolveUnsafe, encodings } from \"./src/encoding/All.ts\"; export { encodings }",
    tables: 89
  }
]
const dataFiles = (ids: ReadonlyArray<string>) =>
  ids.filter((id) => /internal\/characterEncoding\/[^/]+Data\.ts$/.test(id)).sort()
const verify = async (code: string, name: string) => {
  const module = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"))
  if (name === "utf8-only") {
    assert.equal(module.decode(new TextEncoder().encode("😀")), "😀")
  } else if (name === "cp1251-only") {
    assert.equal(module.decode(Uint8Array.of(0xcf, 0xf0)), "Пр")
  } else if (name === "all-encodings") {
    assert.ok(Array.isArray(module.encodings))
    assert.ok(module.encodings.length > 90)
  }
}
console.log(JSON.stringify({ node: process.version, esbuild: esbuild.version, rolldown: rolldown.VERSION }))
for (const entry of cases) {
  const built = await esbuild.build({
    stdin: { contents: entry.source, resolveDir: resolve(root, "packages/effect"), loader: "ts" },
    bundle: true,
    write: false,
    minify: true,
    charset: "utf8",
    format: "esm",
    platform: "browser",
    target: "es2022",
    metafile: true
  })
  const esbuildTables = dataFiles(Object.keys(built.metafile.inputs))
  await verify(built.outputFiles[0].text, entry.name)
  assert.equal(esbuildTables.length, entry.tables, entry.name + ": esbuild imports unexpected tables")
  if (entry.tables === 1) assert.ok(esbuildTables[0].endsWith("/windows1251Data.ts"))
  const modules: Array<string> = []
  const bundle = await rolldown.rolldown({
    input: "encoding-bundle-entry",
    platform: "browser",
    plugins: [{
      name: "encoding-bundle-entry",
      resolveId(id: string) {
        if (id === "encoding-bundle-entry") return "\0encoding-bundle-entry"
        if (id.startsWith("effect/")) return resolve(root, "packages/effect/src", id.slice(7) + ".ts")
      },
      load(id: string) {
        if (id === "\0encoding-bundle-entry") return entry.source
      },
      moduleParsed(info: { id: string }) {
        modules.push(info.id)
      }
    }]
  })
  const output = await bundle.generate({ format: "esm", minify: true })
  await bundle.close()
  const rolldownTables = dataFiles(modules)
  assert.equal(rolldownTables.length, entry.tables, entry.name + ": rolldown imports unexpected tables")
  if (entry.tables === 1) assert.ok(rolldownTables[0].endsWith("/windows1251Data.ts"))
  const code = output.output.filter((item: { type: string }) => item.type === "chunk").map((item: { code: string }) =>
    item.code
  ).join("\n")
  await verify(code, entry.name)
  console.log(JSON.stringify({
    entry: entry.name,
    esbuild: {
      bytes: built.outputFiles[0].contents.length,
      gzip: gzipSync(built.outputFiles[0].contents).length,
      mappingModules: esbuildTables.length
    },
    rolldown: { bytes: Buffer.byteLength(code), gzip: gzipSync(code).length, mappingModules: rolldownTables.length }
  }))
}
