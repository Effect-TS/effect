import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { ReleaseError } from "./Errors.ts"
import { Git } from "./Git.ts"
import { GitHub } from "./GitHub.ts"
import { Pnpm, type StagedPackage } from "./Pnpm.ts"
import { Registry } from "./Registry.ts"
import { effectiveReleases, type ReleasePlan } from "./ReleasePlan.ts"
import * as Routing from "./Routing.ts"
import type { Route, Skipped } from "./Routing.ts"
import * as VersionPullRequest from "./VersionPullRequest.ts"
import type { SyncResult } from "./VersionPullRequest.ts"
import { Workspace } from "./Workspace.ts"

export interface RunOptions {
  /** dist-tag for staged versions (`rc` while the fixed group is on the rc lane). */
  readonly tag: string
  /** Pass `--dry-run` to pnpm when staging; the PR path is unaffected. */
  readonly dryRun?: boolean | undefined
}

export type RunResult =
  | { readonly _tag: "VersionPullRequest"; readonly result: SyncResult }
  | {
    readonly _tag: "Staged"
    readonly staged: ReadonlyArray<StagedPackage>
    readonly skipped: ReadonlyArray<Skipped>
  }
  | { readonly _tag: "Idle"; readonly skipped: ReadonlyArray<Skipped> }

/**
 * Orchestrates one push to `main`:
 *
 * - `plan` is `Pnpm.dryRunPlan`;
 * - `route` feeds `Routing.decide` with the plan, `Workspace.packages`, one
 *   `Registry.isPublished` probe per public package at its manifest version,
 *   and `Registry.listStaged`. The registry is not consulted while the plan
 *   has effective releases, since pending intents always win;
 * - `run` follows the route: `Version` → `VersionPullRequest.sync`;
 *   `Stage` → `Pnpm.stagePublish({ tag, packages: toStage names })`;
 *   `Idle` → nothing. It never calls `stagePublish` on the `Version` route
 *   and never touches git or GitHub on the `Stage` route.
 */
export class Release extends Context.Service<Release, {
  readonly plan: Effect.Effect<ReleasePlan, ReleaseError>
  readonly route: Effect.Effect<Route, ReleaseError>
  readonly run: (options: RunOptions) => Effect.Effect<RunResult, ReleaseError>
}>()("@effect/release/Release") {
  static readonly layer: Layer.Layer<Release, never, Pnpm | Git | GitHub | Registry | Workspace> = Layer.effect(
    Release,
    Effect.gen(function*() {
      const pnpm = yield* Pnpm
      const git = yield* Git
      const github = yield* GitHub
      const registry = yield* Registry
      const workspace = yield* Workspace

      const plan = pnpm.dryRunPlan

      const route: Effect.Effect<Route, ReleaseError> = Effect.gen(function*() {
        const currentPlan = yield* plan
        const packages = yield* workspace.packages
        if (effectiveReleases(currentPlan).length > 0) {
          return yield* Routing.decide({ plan: currentPlan, packages, published: new Set(), staged: [] })
        }
        const publicPackages = packages.filter((pkg) => !pkg.private)
        const publishedKeys = yield* Effect.forEach(
          publicPackages,
          (pkg) =>
            registry.isPublished(pkg.name, pkg.version).pipe(
              Effect.map((published) => published ? Routing.versionKey(pkg.name, pkg.version) : undefined)
            ),
          { concurrency: 8 }
        )
        const staged = yield* registry.listStaged
        return yield* Routing.decide({
          plan: currentPlan,
          packages,
          published: new Set(publishedKeys.filter((key): key is string => key !== undefined)),
          staged
        })
      })

      const run = Effect.fn("Release.run")(function*(options: RunOptions) {
        const decision = yield* route
        switch (decision._tag) {
          case "Version": {
            const result = yield* VersionPullRequest.sync(decision.plan).pipe(
              Effect.provideService(Git, git),
              Effect.provideService(Pnpm, pnpm),
              Effect.provideService(GitHub, github)
            )
            return { _tag: "VersionPullRequest", result } as const
          }
          case "Stage": {
            const staged = yield* pnpm.stagePublish({
              tag: options.tag,
              packages: decision.toStage.map((pkg) => pkg.name),
              dryRun: options.dryRun
            })
            return { _tag: "Staged", staged, skipped: decision.skipped } as const
          }
          case "Idle": {
            return { _tag: "Idle", skipped: decision.skipped } as const
          }
        }
      })

      return Release.of({ plan, route, run })
    })
  )
}
