import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { notImplementedEffect, type ReleaseError } from "./Errors.ts"
import type { AppliedVersion, ReleasePlan } from "./ReleasePlan.ts"

/** One package reported by `pnpm stage publish -r --json`. */
export interface StagedPackage {
  readonly name: string
  readonly version: string
  /** Absent on `--dry-run`. */
  readonly stageId: Option.Option<string>
}

/**
 * The three pnpm invocations the release tool needs. Every command runs from
 * the workspace root with stdin detached, as it would in CI.
 *
 * - `dryRunPlan`: `pnpm version -r --dry-run`, parsed with `ReleasePlan.parseDryRun`.
 * - `applyVersions`: `pnpm version -r --json`; bumps manifests, writes
 *   changelogs and `.changeset/ledger.yaml`, deletes consumed intents that
 *   are not lane prereleases. Requires a clean working tree.
 * - `stagePublish`: `pnpm stage publish -r --tag <tag> --no-git-checks --json`
 *   with one `--filter <name>` per requested package. Never `pnpm publish`.
 */
export class Pnpm extends Context.Service<Pnpm, {
  readonly dryRunPlan: Effect.Effect<ReleasePlan, ReleaseError>
  readonly applyVersions: Effect.Effect<ReadonlyArray<AppliedVersion>, ReleaseError>
  readonly stagePublish: (options: {
    readonly tag: string
    readonly packages: ReadonlyArray<string>
    readonly dryRun?: boolean | undefined
  }) => Effect.Effect<ReadonlyArray<StagedPackage>, ReleaseError>
}>()("@effect/release/Pnpm") {
  static readonly layer: Layer.Layer<Pnpm, never, ChildProcessSpawner> = Layer.effect(
    Pnpm,
    notImplementedEffect("Pnpm.layer")
  )
}
