#!/usr/bin/env node

/**
 * Published entrypoint. Attempts to load the bundled CLI from `dist` first,
 * then falls back to the local build output when running from source.
 *
 * @since 0.1.0
 */
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const candidates = [
  "./build/esm/bin.js",
  "./dist/bin.mjs"
]

let loaded = false

for (const candidate of candidates) {
  const absolute = resolve(here, candidate)
  if (existsSync(absolute)) {
    await import(pathToFileURL(absolute).href)
    loaded = true
    break
  }
}

if (!loaded) {
  throw new Error("note: build output not found. Run `pnpm build` first.")
}
