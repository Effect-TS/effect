#!/usr/bin/env node
import { runCli } from "./Cli.ts"

try {
  runCli(process.argv.slice(2))
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
