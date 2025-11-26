#!/usr/bin/env node
/**
 * Wrapper script to run main.ts with experimental-transform-types enabled.
 * This allows Node.js to natively execute TypeScript with .ts imports.
 */
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const mainTs = join(__dirname, "main.ts")

const result = spawnSync(
  process.execPath,
  ["--experimental-transform-types", "--no-warnings", mainTs],
  {
    stdio: "inherit",
    env: process.env
  }
)

process.exit(result.status ?? 0)
