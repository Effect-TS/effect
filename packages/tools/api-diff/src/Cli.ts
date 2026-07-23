import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { diffSnapshots } from "./Diff.ts"
import { writeJson } from "./Json.ts"
import { mappingModules, parseMigrationMap, renderMigrationMarkdown, validateMigrationMap } from "./Mapping.ts"
import { renderMarkdownReport } from "./Report.ts"
import { prepareSnapshot, resolveRef, writeSnapshotOutput } from "./Worktrees.ts"

interface CliOptions {
  readonly baseRef?: string | undefined
  readonly headRef?: string | undefined
  readonly mapping?: string | undefined
  readonly output?: string | undefined
  readonly writeMappingDoc?: string | undefined
  readonly help: boolean
}

const usage = `Usage:
  pnpm api-diff --base-ref <ref> --head-ref <ref> --mapping <file> --output <directory>
  pnpm api-diff --mapping <file> --write-mapping-doc <file>

Options:
  --base-ref <ref>          Explicit base Git ref
  --head-ref <ref>          Explicit head Git ref
  --mapping <file>          Versioned migration map JSON
  --output <directory>      Report output directory
  --write-mapping-doc <file>  Generate Markdown from the migration map
  -h, --help                Show this help
`

const parseArgs = (args: ReadonlyArray<string>): CliOptions => {
  let baseRef: string | undefined
  let headRef: string | undefined
  let mapping: string | undefined
  let output: string | undefined
  let writeMappingDoc: string | undefined
  let help = false
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!
    if (argument === "--help" || argument === "-h") {
      help = true
      continue
    }
    if (
      argument !== "--base-ref" && argument !== "--head-ref" && argument !== "--mapping" &&
      argument !== "--output" && argument !== "--write-mapping-doc"
    ) {
      throw new Error(`Unknown option: ${argument}`)
    }
    const value = args[++index]
    if (value === undefined || value.startsWith("-")) {
      throw new Error(`Missing value for ${argument}`)
    }
    if (argument === "--base-ref") {
      baseRef = value
    } else if (argument === "--head-ref") {
      headRef = value
    } else if (argument === "--mapping") {
      mapping = value
    } else if (argument === "--output") {
      output = value
    } else {
      writeMappingDoc = value
    }
  }
  return { baseRef, headRef, mapping, output, writeMappingDoc, help }
}

const findRepoRoot = (cwd: string): string => {
  let current = resolve(cwd)
  while (true) {
    if (existsSync(join(current, ".git")) || existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current
    }
    const parent = dirname(current)
    if (parent === current) {
      throw new Error(`Could not locate repository root from ${cwd}`)
    }
    current = parent
  }
}

const absolute = (repoRoot: string, path: string): string => isAbsolute(path) ? path : resolve(repoRoot, path)

export const runCli = (args: ReadonlyArray<string>, cwd = process.cwd()): void => {
  const options = parseArgs(args)
  if (options.help) {
    process.stdout.write(usage)
    return
  }
  if (options.mapping === undefined) {
    throw new Error("--mapping is required")
  }
  const repoRoot = findRepoRoot(cwd)
  const mappingPath = absolute(repoRoot, options.mapping)
  const mapping = parseMigrationMap(mappingPath)
  const staticDiagnostics = validateMigrationMap(mapping, { repoRoot })
  if (options.writeMappingDoc !== undefined) {
    if (staticDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      throw new Error(staticDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n"))
    }
    const output = absolute(repoRoot, options.writeMappingDoc)
    mkdirSync(dirname(output), { recursive: true })
    writeFileSync(output, renderMigrationMarkdown(mapping))
    process.stdout.write(`Generated ${relative(repoRoot, output)}\n`)
    return
  }
  if (options.baseRef === undefined || options.headRef === undefined || options.output === undefined) {
    throw new Error("--base-ref, --head-ref, and --output are required for comparison")
  }
  if (staticDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    throw new Error(staticDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n"))
  }

  const baseSha = resolveRef(repoRoot, options.baseRef)
  const headSha = resolveRef(repoRoot, options.headRef)
  const modules = mappingModules(mapping)
  const toolRoot = join(repoRoot, "tmp", "api-diff")
  const cacheRoot = join(toolRoot, "cache")
  const worktreesRoot = join(toolRoot, "worktrees")
  process.stdout.write(`Base ${options.baseRef}: ${baseSha}\nHead ${options.headRef}: ${headSha}\n`)
  const base = prepareSnapshot({
    repoRoot,
    cacheRoot,
    worktreesRoot,
    name: "base",
    ref: options.baseRef,
    sha: baseSha,
    modules: modules.base
  })
  const head = prepareSnapshot({
    repoRoot,
    cacheRoot,
    worktreesRoot,
    name: "head",
    ref: options.headRef,
    sha: headSha,
    modules: modules.head
  })
  const mappingDiagnostics = validateMigrationMap(mapping, { base, head, repoRoot })
  const output = absolute(repoRoot, options.output)
  mkdirSync(output, { recursive: true })
  writeSnapshotOutput(join(output, "base.snapshot.json"), base)
  writeSnapshotOutput(join(output, "head.snapshot.json"), head)
  const diff = diffSnapshots(base, head, mapping, mappingDiagnostics)
  writeJson(join(output, "diff.json"), diff)
  writeFileSync(join(output, "report.md"), renderMarkdownReport(diff))

  const errors = mappingDiagnostics.filter((diagnostic) => diagnostic.severity === "error")
  process.stdout.write(`Wrote ${relative(repoRoot, output)} (${diff.changes.length} changes)\n`)
  if (errors.length > 0) {
    throw new Error(errors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n"))
  }

  const report = readFileSync(join(output, "report.md"), "utf8")
  if (report.length === 0) {
    throw new Error("Generated Markdown report is empty")
  }
}
