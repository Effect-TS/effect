import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Command from "effect/unstable/cli/Command"
import * as Flag from "effect/unstable/cli/Flag"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { diffSnapshots } from "./Diff.ts"
import { writeJson } from "./Json.ts"
import { mappingModules, parseMigrationMap, renderMigrationMarkdown, validateMigrationMap } from "./Mapping.ts"
import { renderMarkdownReport } from "./Report.ts"
import { prepareSnapshot, resolveRef, writeSnapshotOutput } from "./Worktrees.ts"

const baseRef = Flag.string("base-ref").pipe(
  Flag.withDescription("Explicit base Git ref"),
  Flag.optional
)

const headRef = Flag.string("head-ref").pipe(
  Flag.withDescription("Explicit head Git ref"),
  Flag.optional
)

const mapping = Flag.string("mapping").pipe(
  Flag.withMetavar("FILE"),
  Flag.withDescription("Versioned migration map JSON")
)

const output = Flag.string("output").pipe(
  Flag.withMetavar("DIRECTORY"),
  Flag.withDescription("Report output directory"),
  Flag.optional
)

const writeMappingDoc = Flag.string("write-mapping-doc").pipe(
  Flag.withMetavar("FILE"),
  Flag.withDescription("Generate Markdown from the migration map"),
  Flag.optional
)

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

class ApiDiffError extends Data.TaggedError("ApiDiffError")<{
  readonly message: string
  readonly cause: unknown
}> {}

interface CliOptions {
  readonly baseRef: Option.Option<string>
  readonly headRef: Option.Option<string>
  readonly mapping: string
  readonly output: Option.Option<string>
  readonly writeMappingDoc: Option.Option<string>
}

const runApiDiff = Effect.fnUntraced(function*(options: CliOptions) {
  yield* Effect.try({
    try: () => runApiDiffSync(options),
    catch: (cause) =>
      new ApiDiffError({
        message: cause instanceof Error ? cause.message : String(cause),
        cause
      })
  })
})

const runApiDiffSync = (options: CliOptions): void => {
  const repoRoot = findRepoRoot(process.cwd())
  const mappingPath = absolute(repoRoot, options.mapping)
  const mapping = parseMigrationMap(mappingPath)
  const staticDiagnostics = validateMigrationMap(mapping, { repoRoot })
  if (Option.isSome(options.writeMappingDoc)) {
    if (staticDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      throw new Error(staticDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n"))
    }
    const output = absolute(repoRoot, options.writeMappingDoc.value)
    mkdirSync(dirname(output), { recursive: true })
    writeFileSync(output, renderMigrationMarkdown(mapping))
    process.stdout.write(`Generated ${relative(repoRoot, output)}\n`)
    return
  }
  if (Option.isNone(options.baseRef) || Option.isNone(options.headRef) || Option.isNone(options.output)) {
    throw new Error("--base-ref, --head-ref, and --output are required for comparison")
  }
  if (staticDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    throw new Error(staticDiagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n"))
  }

  const baseSha = resolveRef(repoRoot, options.baseRef.value)
  const headSha = resolveRef(repoRoot, options.headRef.value)
  const modules = mappingModules(mapping)
  const toolRoot = join(repoRoot, "tmp", "api-diff")
  const cacheRoot = join(toolRoot, "cache")
  const worktreesRoot = join(toolRoot, "worktrees")
  process.stdout.write(`Base ${options.baseRef.value}: ${baseSha}\nHead ${options.headRef.value}: ${headSha}\n`)
  const base = prepareSnapshot({
    repoRoot,
    cacheRoot,
    worktreesRoot,
    name: "base",
    ref: options.baseRef.value,
    sha: baseSha,
    modules: modules.base
  })
  const head = prepareSnapshot({
    repoRoot,
    cacheRoot,
    worktreesRoot,
    name: "head",
    ref: options.headRef.value,
    sha: headSha,
    modules: modules.head
  })
  const mappingDiagnostics = validateMigrationMap(mapping, { base, head, repoRoot })
  const output = absolute(repoRoot, options.output.value)
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

export const cli = Command.make("api-diff", {
  baseRef,
  headRef,
  mapping,
  output,
  writeMappingDoc
}).pipe(
  Command.withDescription("Compare the consumer-visible TypeScript API of two repository revisions"),
  Command.withHandler(runApiDiff)
)
