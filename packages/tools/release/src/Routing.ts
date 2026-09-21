import type * as Effect from "effect/Effect"
import { notImplementedEffect, type ReleaseError } from "./Errors.ts"
import type { StagedItem } from "./Registry.ts"
import type { Release, ReleasePlan } from "./ReleasePlan.ts"
import type { WorkspacePackage } from "./Workspace.ts"

/**
 * Decides what a push to `main` should do. Exactly one of:
 *
 * - `Version`: the plan has at least one effective release, so the version
 *   PR must be created or updated. Nothing is staged while intents are
 *   pending, even if unpublished versions exist.
 * - `Stage`: the plan is empty and at least one public package's manifest
 *   version is neither published nor already staged. This is the state right
 *   after the version PR merges. `skipped` lists public packages left alone
 *   and why.
 * - `Idle`: the plan is empty and there is nothing to stage. `skipped`
 *   explains every public package (published, or staged and awaiting
 *   approval).
 *
 * Private packages never appear in any branch. A staged item for a public
 * package at a version other than its manifest version is a stale upload; the
 * decision fails with a `ReleaseError` naming the package and both versions,
 * because staging on top of it would put two versions in front of the
 * approval gate. Someone rejects the stale item, then re-runs.
 */
export type Route =
  | {
    readonly _tag: "Version"
    readonly plan: ReleasePlan
    /** `ReleasePlan.effectiveReleases(plan)`. */
    readonly releases: ReadonlyArray<Release>
  }
  | {
    readonly _tag: "Stage"
    readonly toStage: ReadonlyArray<WorkspacePackage>
    readonly skipped: ReadonlyArray<Skipped>
  }
  | {
    readonly _tag: "Idle"
    readonly skipped: ReadonlyArray<Skipped>
  }

export interface Skipped {
  readonly name: string
  readonly version: string
  readonly reason: "published" | "staged"
}

export interface RoutingInput {
  readonly plan: ReleasePlan
  readonly packages: ReadonlyArray<WorkspacePackage>
  /** `name@version` keys of every (package, manifest version) pair the registry already serves. */
  readonly published: ReadonlySet<string>
  readonly staged: ReadonlyArray<StagedItem>
}

export const versionKey = (name: string, version: string): string => `${name}@${version}`

export const decide = (_input: RoutingInput): Effect.Effect<Route, ReleaseError> =>
  notImplementedEffect("Routing.decide")
