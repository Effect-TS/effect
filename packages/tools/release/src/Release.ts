import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { notImplementedEffect, type ReleaseError } from "./Errors.ts"
import type { Git } from "./Git.ts"
import type { GitHub } from "./GitHub.ts"
import type { Pnpm, StagedPackage } from "./Pnpm.ts"
import type { Registry } from "./Registry.ts"
import type { ReleasePlan } from "./ReleasePlan.ts"
import type { Route, Skipped } from "./Routing.ts"
import type { SyncResult } from "./VersionPullRequest.ts"
import type { Workspace } from "./Workspace.ts"

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
 *   and `Registry.listStaged`;
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
    notImplementedEffect("Release.layer")
  )
}
