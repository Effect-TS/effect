/* eslint-env node */
/* global console, process */
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = dirname(__dirname) // package root

function assert(cond, msg) {
  if (!cond) {
    console.error(`verify-exports: ${msg}`)
    process.exit(1)
  }
}

// Paths may be one of:
// - Workspace build before packing:   dist/dist/{esm,cjs,dts}/*
// - Publish dir (pack root=dist):     dist/{esm,cjs,dts}/*
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

// Basic import checks via file URLs to dist dir
const pkgJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
assert(pkgJson.exports && pkgJson.exports["./effect"], "exports[\"./effect\"] not present")

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const distUrl = pathToFileURL(join(root, "dist")).href

// Try ESM import by resolving file path directly
const esmUrl = pathToFileURL(distEsm).href
await import(esmUrl).catch((e) => {
  console.error("verify-exports: ESM import failed:", e)
  process.exit(1)
})

console.log("verify-exports: OK")
