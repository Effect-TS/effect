import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import { diffSnapshots } from "./Diff.ts"
import { ApiDiffError } from "./Error.ts"
import { prettyJson } from "./Json.ts"
import { decodeMigrationMap, mappingModules, renderMigrationMarkdown, validateMigrationMap } from "./Mapping.ts"
import type { MappingDiagnostic, MigrationMap } from "./Model.ts"
import { renderMarkdownReport } from "./Report.ts"
import { Worktrees } from "./Worktrees.ts"

export interface ApiDiffOptions {
  readonly baseRef: Option.Option<string>
  readonly headRef: Option.Option<string>
  readonly mapping: string
  readonly output: Option.Option<string>
  readonly writeMappingDoc: Option.Option<string>
}

const diagnosticMessage = (diagnostics: ReadonlyArray<MappingDiagnostic>): string =>
  diagnostics
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
    .join("\n")

export class ApiDiff extends Context.Service<ApiDiff, {
  readonly run: (options: ApiDiffOptions) => Effect.Effect<void, ApiDiffError>
}>()("@effect/api-diff/ApiDiff") {
  static readonly layerNoDependencies = Layer.effect(
    ApiDiff,
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const worktrees = yield* Worktrees

      const absolute = (repoRoot: string, location: string): string =>
        path.isAbsolute(location) ? location : path.resolve(repoRoot, location)

      const findRepoRoot = Effect.fnUntraced(function*() {
        let current = path.resolve()
        while (true) {
          if (
            (yield* fs.exists(path.join(current, ".git"))) ||
            (yield* fs.exists(path.join(current, "pnpm-workspace.yaml")))
          ) {
            return current
          }
          const parent = path.dirname(current)
          if (parent === current) {
            return yield* new ApiDiffError({
              message: `Could not locate repository root from ${path.resolve()}`
            })
          }
          current = parent
        }
      })

      const readGuideSources = Effect.fnUntraced(function*(mapping: MigrationMap, repoRoot: string) {
        const sources = new Map<string, string>()
        const guides = new Set(mapping.apis.flatMap((entry) => entry.guide === undefined ? [] : [entry.guide]))
        for (const guide of guides) {
          const location = absolute(repoRoot, guide)
          if (yield* fs.exists(location)) {
            sources.set(guide, yield* fs.readFileString(location))
          }
        }
        return sources
      })

      const failOnDiagnostics = (diagnostics: ReadonlyArray<MappingDiagnostic>): Effect.Effect<void, ApiDiffError> => {
        const message = diagnosticMessage(diagnostics)
        return message.length === 0 ? Effect.void : new ApiDiffError({ message })
      }

      const runInternal = Effect.fnUntraced(function*(options: ApiDiffOptions) {
        const repoRoot = yield* findRepoRoot()
        const mappingLocation = absolute(repoRoot, options.mapping)
        const mappingSource = yield* fs.readFileString(mappingLocation)
        const mapping = yield* decodeMigrationMap(mappingSource).pipe(
          Effect.mapError((cause) =>
            new ApiDiffError({
              message: `Invalid migration map ${mappingLocation}`,
              cause
            })
          )
        )
        const guideSources = yield* readGuideSources(mapping, repoRoot)
        const staticDiagnostics = validateMigrationMap(mapping, { guideSources })

        if (Option.isSome(options.writeMappingDoc)) {
          yield* failOnDiagnostics(staticDiagnostics)
          const output = absolute(repoRoot, options.writeMappingDoc.value)
          yield* fs.makeDirectory(path.dirname(output), { recursive: true })
          yield* fs.writeFileString(output, renderMigrationMarkdown(mapping))
          yield* Console.log(`Generated ${path.relative(repoRoot, output)}`)
          return
        }

        if (Option.isNone(options.baseRef) || Option.isNone(options.headRef) || Option.isNone(options.output)) {
          return yield* new ApiDiffError({
            message: "--base-ref, --head-ref, and --output are required for comparison"
          })
        }
        yield* failOnDiagnostics(staticDiagnostics)

        const baseSha = yield* worktrees.resolveRef(repoRoot, options.baseRef.value)
        const headSha = yield* worktrees.resolveRef(repoRoot, options.headRef.value)
        const modules = mappingModules(mapping)
        const toolRoot = path.join(repoRoot, "tmp", "api-diff")
        const cacheRoot = path.join(toolRoot, "cache")
        const worktreesRoot = path.join(toolRoot, "worktrees")
        yield* Console.log(
          `Base ${options.baseRef.value}: ${baseSha}\nHead ${options.headRef.value}: ${headSha}`
        )
        const base = yield* worktrees.prepareSnapshot({
          repoRoot,
          cacheRoot,
          worktreesRoot,
          name: "base",
          ref: options.baseRef.value,
          sha: baseSha,
          modules: modules.base
        })
        const head = yield* worktrees.prepareSnapshot({
          repoRoot,
          cacheRoot,
          worktreesRoot,
          name: "head",
          ref: options.headRef.value,
          sha: headSha,
          modules: modules.head
        })
        const mappingDiagnostics = validateMigrationMap(mapping, { base, guideSources, head })
        const output = absolute(repoRoot, options.output.value)
        const diff = diffSnapshots(base, head, mapping, mappingDiagnostics)
        const report = renderMarkdownReport(diff)

        yield* fs.makeDirectory(output, { recursive: true })
        yield* fs.writeFileString(path.join(output, "base.snapshot.json"), prettyJson(base))
        yield* fs.writeFileString(path.join(output, "head.snapshot.json"), prettyJson(head))
        yield* fs.writeFileString(path.join(output, "diff.json"), prettyJson(diff))
        yield* fs.writeFileString(path.join(output, "report.md"), report)
        yield* Console.log(`Wrote ${path.relative(repoRoot, output)} (${diff.changes.length} changes)`)
        yield* failOnDiagnostics(mappingDiagnostics)
        if (report.length === 0) {
          return yield* new ApiDiffError({ message: "Generated Markdown report is empty" })
        }
      })

      const run = (options: ApiDiffOptions): Effect.Effect<void, ApiDiffError> =>
        runInternal(options).pipe(
          Effect.mapError((cause) =>
            cause instanceof ApiDiffError
              ? cause
              : new ApiDiffError({
                message: "API diff failed",
                cause
              })
          )
        )

      return ApiDiff.of({ run })
    })
  )

  static readonly layer = this.layerNoDependencies.pipe(
    Layer.provide(Worktrees.layer)
  )
}
