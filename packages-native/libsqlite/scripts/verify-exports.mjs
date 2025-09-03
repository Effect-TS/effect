/* eslint-env node */
/* global console, process */
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = dirname(__dirname)

function assert(cond, msg) {
  if (!cond) {
    console.error(`verify-exports: ${msg}`)
    process.exit(1)
  }
}

const primary = {
  esm: join(root, "dist/esm/effect.js"),
  cjs: join(root, "dist/cjs/effect.js"),
  dts: join(root, "dist/dts/effect.d.ts")
}
const fallback = {
  esm: join(root, "dist/dist/esm/effect.js"),
  cjs: join(root, "dist/dist/cjs/effect.js"),
  dts: join(root, "dist/dist/dts/effect.d.ts")
}
const distEsm = existsSync(primary.esm) ? primary.esm : fallback.esm
const distCjs = existsSync(primary.cjs) ? primary.cjs : fallback.cjs
const distDts = existsSync(primary.dts) ? primary.dts : fallback.dts

assert(existsSync(distEsm), `missing ${distEsm}`)
assert(existsSync(distCjs), `missing ${distCjs}`)
assert(existsSync(distDts), `missing ${distDts}`)

let pkgJson
try {
  pkgJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
} catch (e) {
  assert(false, `failed to read/parse package.json: ${e?.message ?? e}`)
}
assert(pkgJson.exports && pkgJson.exports["./effect"], "exports[\"./effect\"] not present")

await import(pathToFileURL(distEsm).href).catch((e) => {
  console.error("verify-exports: ESM import failed:", e)
  process.exit(1)
})

console.log("verify-exports: OK")
