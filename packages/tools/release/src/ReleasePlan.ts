import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { ReleaseError } from "./Errors.ts"

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

const PLAN_HEADER = "Release plan:"

const PLAN_LINE = /^(\S+): (\S+) → (\S+) \((patch|minor|major), via ([^)]+)\)$/

/**
 * Parses dry-run output. Fails with `ReleaseError` when the text is neither
 * {@link NO_PENDING_CHANGES} nor a `Release plan:` block whose every line
 * matches `<name>: <current> → <new> (<bump>, via <cause>[+<cause>...])`.
 */
export const parseDryRun = (text: string): Effect.Effect<ReleasePlan, ReleaseError> =>
  Effect.gen(function*() {
    const lines = text.split(/\r?\n/).map((line) => line.trim())
    if (lines.some((line) => line === NO_PENDING_CHANGES)) {
      return empty
    }
    const headerIndex = lines.indexOf(PLAN_HEADER)
    if (headerIndex === -1) {
      return yield* new ReleaseError({ message: `Unexpected output from pnpm version -r --dry-run: ${text.trim()}` })
    }
    const releases: Array<Release> = []
    for (const line of lines.slice(headerIndex + 1)) {
      if (line === "") continue
      const match = PLAN_LINE.exec(line)
      if (match === null) {
        return yield* new ReleaseError({ message: `Unrecognised release plan line: ${line}` })
      }
      const [, name, currentVersion, newVersion, bumpType, causes] = match
      releases.push({
        name,
        currentVersion,
        newVersion,
        bumpType: bumpType as BumpType,
        causes: causes.split("+").map((cause) => cause.trim())
      })
    }
    return { releases }
  })

/**
 * Releases that actually change a version. pnpm lists dependents whose
 * version does not move (`0.0.0 → 0.0.0`, private tooling pulled in "via
 * dependencies"); those are not releases and must not open a version PR.
 */
export const effectiveReleases = (plan: ReleasePlan): ReadonlyArray<Release> =>
  plan.releases.filter((release) => release.currentVersion !== release.newVersion)

/** `true` when {@link effectiveReleases} is empty. */
export const isEmpty = (plan: ReleasePlan): boolean => effectiveReleases(plan).length === 0

const prereleaseIdentifier = (version: string): string | undefined => {
  const dash = version.indexOf("-")
  if (dash === -1) return undefined
  const identifier = version.slice(dash + 1).split(".")[0]
  return identifier === "" || /^\d+$/.test(identifier) ? undefined : identifier
}

/**
 * The prerelease identifier shared by every effective release (`rc` for
 * `4.0.0-rc.118`), or none when any effective release is stable or the
 * identifiers differ. Used to title the version PR and to pick the dist-tag.
 */
export const prereleaseTag = (plan: ReleasePlan): Option.Option<string> => {
  const releases = effectiveReleases(plan)
  if (releases.length === 0) return Option.none()
  const identifiers = releases.map((release) => prereleaseIdentifier(release.newVersion))
  const [first] = identifiers
  return first !== undefined && identifiers.every((identifier) => identifier === first)
    ? Option.some(first)
    : Option.none()
}

/** One entry of the JSON printed by `pnpm version -r --json` after applying a plan. */
export interface AppliedVersion {
  readonly name: string
  readonly currentVersion: string
  readonly newVersion: string
}

const AppliedVersions = Schema.fromJsonString(
  Schema.Array(
    Schema.Struct({
      name: Schema.String,
      currentVersion: Schema.String,
      newVersion: Schema.String
    })
  )
)

const decodeAppliedVersions = Schema.decodeUnknownEffect(AppliedVersions)

/** Parses the JSON array printed by `pnpm version -r --json`. */
export const parseApplied = (json: string): Effect.Effect<ReadonlyArray<AppliedVersion>, ReleaseError> =>
  decodeAppliedVersions(json).pipe(
    Effect.map((entries) =>
      entries.map((entry): AppliedVersion => ({
        name: entry.name,
        currentVersion: entry.currentVersion,
        newVersion: entry.newVersion
      }))
    ),
    Effect.mapError((cause) =>
      new ReleaseError({ message: `Unexpected output from pnpm version -r --json: ${json.trim()}`, cause })
    )
  )
