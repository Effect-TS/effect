/* eslint-env node */
/* global console, process */
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
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

// Check dist artifacts exist
// build-utils pack-v3 nests artifacts under dist/dist/*
const distEsm = join(root, "dist/dist/esm/effect.js")
const distCjs = join(root, "dist/dist/cjs/effect.js")
const distDts = join(root, "dist/dist/dts/effect.d.ts")

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

// Also verify CJS require works
try {
  const req = createRequire(import.meta.url)
  req(distCjs)
} catch (e) {
  console.error("verify-exports: CJS require failed:", e)
  process.exit(1)
}

console.log("verify-exports: OK")
