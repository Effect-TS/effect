#!/usr/bin/env node
import * as path from "node:path"
import { parseArgs } from "node:util"
import { computeJSDocInputHash, extractJSDocsSync, loadJSDocConfig, readJSDocModel, writeJSDocModel } from "./Jsdocs.ts"

function reportDiagnostics(model: ReturnType<typeof extractJSDocsSync>, check: boolean) {
  const diagnostics = model.files.reduce((count, file) => count + file.diagnostics.length, 0)
  if (diagnostics > 0) {
    for (const file of model.files) {
      for (const diagnostic of file.diagnostics) {
        process.stderr.write(`${file.file}: ${diagnostic.message}\n`)
      }
    }
    if (check) process.exitCode = 1
  }
}

try {
  const args = parseArgs({
    allowPositionals: true,
    options: {
      check: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      project: { type: "string", multiple: true },
      testNamePattern: { type: "string", short: "t" }
    }
  })
  if (args.values.help === true) {
    process.stdout.write(`Usage: effect-jsdocs [filters...] [options]

Options:
  --check                       Exit with an error when diagnostics are found
  --project <package>           Select a package; repeatable and supports * and ?
  -t, --testNamePattern <regex> Match module, declaration, and example title
  -h, --help                    Show this help

Positional filters match source paths and public module names by substring.
Targeted runs always check diagnostics and never update the cached model.
`)
    process.exit(0)
  }
  const cwd = process.cwd()
  const check = args.values.check === true
  const config = loadJSDocConfig(cwd)
  const targeted = args.positionals.length > 0 || args.values.project !== undefined ||
    args.values.testNamePattern !== undefined
  if (targeted) {
    const model = extractJSDocsSync({
      cwd,
      ...config,
      exampleFilter: {
        filters: args.positionals,
        ...(args.values.project === undefined ? {} : { projects: args.values.project }),
        ...(args.values.testNamePattern === undefined ? {} : { testNamePattern: args.values.testNamePattern })
      }
    })
    process.stdout.write("Checked targeted JSDoc examples\n")
    reportDiagnostics(model, true)
    process.exit()
  }
  const inputHash = computeJSDocInputHash({ cwd, ...config })
  const cached = readJSDocModel(path.resolve(cwd, config.output))
  if (cached._tag === "Success" && cached.value.inputHash === inputHash) {
    process.stdout.write(`Skipped ${config.output}\n`)
    reportDiagnostics(cached.value, check)
  } else {
    const model = extractJSDocsSync({ cwd, ...config })
    writeJSDocModel(cwd, config.output, model)
    process.stdout.write(`Wrote ${config.output}\n`)
    reportDiagnostics(model, check)
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
