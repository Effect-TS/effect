#!/usr/bin/env node

import { spawn } from "child_process"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to the TypeScript CLI implementation
const cliPath = join(__dirname, "..", "src", "cli", "steps.ts")

// Forward all arguments and spawn with tsx
const child = spawn(
  "node",
  ["--import", "tsx/esm", cliPath, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env
  }
)

child.on("exit", (code) => {
  process.exit(code ?? 1)
})
