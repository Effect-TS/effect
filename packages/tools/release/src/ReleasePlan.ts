import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import { notImplemented, notImplementedEffect, type ReleaseError } from "./Errors.ts"

/**
 * The release plan pnpm derives from the pending change intents in
 * `.changeset/*.md`, the ledger and the `versioning` configuration.
 *
 * Source of truth: the text printed by `pnpm version -r --dry-run` (and by
 * `pnpm change status`), which looks like
 *
 * ```
 * Release plan:
 *   effect: 4.0.0-rc.117 → 4.0.0-rc.118 (patch, via intent)
 *   scratchpad: 0.0.0 → 0.0.0 (patch, via dependencies)
 * ```
 *
 * or, with nothing pending, the single line {@link NO_PENDING_CHANGES}.
 * `--json` has no effect in dry-run mode on pnpm 11.20, so text is parsed.
 */
export type BumpType = "patch" | "minor" | "major"

export interface Release {
  readonly name: string
  readonly currentVersion: string
  readonly newVersion: string
  readonly bumpType: BumpType
  /** The `via` causes, e.g. `["intent"]`, `["dependencies", "fixed"]`. */
  readonly causes: ReadonlyArray<string>
}

export interface ReleasePlan {
  readonly releases: ReadonlyArray<Release>
}

export const empty: ReleasePlan = { releases: [] }

export const NO_PENDING_CHANGES = "No pending changes. Record one with \"pnpm change\"."

/**
 * Parses dry-run output. Fails with `ReleaseError` when the text is neither
 * {@link NO_PENDING_CHANGES} nor a `Release plan:` block whose every line
 * matches `<name>: <current> → <new> (<bump>, via <cause>[+<cause>...])`.
 */
export const parseDryRun = (_text: string): Effect.Effect<ReleasePlan, ReleaseError> =>
  notImplementedEffect("ReleasePlan.parseDryRun")

/**
 * Releases that actually change a version. pnpm lists dependents whose
 * version does not move (`0.0.0 → 0.0.0`, private tooling pulled in "via
 * dependencies"); those are not releases and must not open a version PR.
 */
export const effectiveReleases = (_plan: ReleasePlan): ReadonlyArray<Release> =>
  notImplemented("ReleasePlan.effectiveReleases")

/** `true` when {@link effectiveReleases} is empty. */
export const isEmpty = (_plan: ReleasePlan): boolean => notImplemented("ReleasePlan.isEmpty")

/**
 * The prerelease identifier shared by every effective release (`rc` for
 * `4.0.0-rc.118`), or none when any effective release is stable or the
 * identifiers differ. Used to title the version PR and to pick the dist-tag.
 */
export const prereleaseTag = (_plan: ReleasePlan): Option.Option<string> => notImplemented("ReleasePlan.prereleaseTag")

/** One entry of the JSON printed by `pnpm version -r --json` after applying a plan. */
export interface AppliedVersion {
  readonly name: string
  readonly currentVersion: string
  readonly newVersion: string
}

/** Parses the JSON array printed by `pnpm version -r --json`. */
export const parseApplied = (_json: string): Effect.Effect<ReadonlyArray<AppliedVersion>, ReleaseError> =>
  notImplementedEffect("ReleasePlan.parseApplied")
