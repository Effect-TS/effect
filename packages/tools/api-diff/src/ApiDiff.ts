import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import { diffSnapshots } from "./Diff.ts"
import { ApiDiffError } from "./Error.ts"
import { prettyJson } from "./Json.ts"
import { renderMarkdownReport } from "./Report.ts"
import { Worktrees } from "./Worktrees.ts"

export interface ApiDiffOptions {
  readonly baseRef: string
  readonly headRef: string
  readonly output: string
}

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

      const runInternal = Effect.fnUntraced(function*(options: ApiDiffOptions) {
        const repoRoot = yield* findRepoRoot()

        const baseSha = yield* worktrees.resolveRef(repoRoot, options.baseRef)
        const headSha = yield* worktrees.resolveRef(repoRoot, options.headRef)
        const toolRoot = path.join(repoRoot, "tmp", "api-diff")
        const cacheRoot = path.join(toolRoot, "cache")
        const worktreesRoot = path.join(toolRoot, "worktrees")
        yield* Console.log(
          `Base ${options.baseRef}: ${baseSha}\nHead ${options.headRef}: ${headSha}`
        )
        const base = yield* worktrees.prepareSnapshot({
          repoRoot,
          cacheRoot,
          worktreesRoot,
          name: "base",
          ref: options.baseRef,
          sha: baseSha
        })
        const head = yield* worktrees.prepareSnapshot({
          repoRoot,
          cacheRoot,
          worktreesRoot,
          name: "head",
          ref: options.headRef,
          sha: headSha
        })
        const output = absolute(repoRoot, options.output)
        const diff = diffSnapshots(base, head)
        const report = renderMarkdownReport(diff)

        yield* fs.makeDirectory(output, { recursive: true })
        yield* fs.writeFileString(path.join(output, "base.snapshot.json"), prettyJson(base))
        yield* fs.writeFileString(path.join(output, "head.snapshot.json"), prettyJson(head))
        yield* fs.writeFileString(path.join(output, "diff.json"), prettyJson(diff))
        yield* fs.writeFileString(path.join(output, "report.md"), report)
        yield* Console.log(`Wrote ${path.relative(repoRoot, output)} (${diff.changes.length} changes)`)
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
