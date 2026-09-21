import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Path from "effect/Path"
import * as Schema from "effect/Schema"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
import { ReleaseError } from "./Errors.ts"
import { findWorkspaceRoot, runCommandOk } from "./Process.ts"
import { type AppliedVersion, NO_PENDING_CHANGES, parseApplied, parseDryRun, type ReleasePlan } from "./ReleasePlan.ts"

/** One package reported by `pnpm stage publish -r --json`. */
export interface StagedPackage {
  readonly name: string
  readonly version: string
  /** Absent on `--dry-run`. */
  readonly stageId: Option.Option<string>
}

const StagePublishOutput = Schema.fromJsonString(
  Schema.Record(
    Schema.String,
    Schema.Struct({
      name: Schema.optionalKey(Schema.String),
      version: Schema.String,
      stageId: Schema.optionalKey(Schema.String)
    })
  )
)

const decodeStagePublishOutput = Schema.decodeUnknownEffect(StagePublishOutput)

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
  static readonly layer: Layer.Layer<Pnpm, never, ChildProcessSpawner | FileSystem.FileSystem | Path.Path> = Layer
    .effect(
      Pnpm,
      Effect.gen(function*() {
        const root = yield* findWorkspaceRoot.pipe(Effect.orDie)
        const spawner = yield* ChildProcessSpawner
        const pnpm = (args: ReadonlyArray<string>) =>
          runCommandOk("pnpm", args, { cwd: root }).pipe(Effect.provideService(ChildProcessSpawner, spawner))

        const dryRunPlan = pnpm(["version", "-r", "--dry-run"]).pipe(Effect.flatMap(parseDryRun))

        const applyVersions = pnpm(["version", "-r", "--json"]).pipe(
          Effect.flatMap((stdout) =>
            stdout.trim() === NO_PENDING_CHANGES
              ? Effect.succeed<ReadonlyArray<AppliedVersion>>([])
              : parseApplied(stdout)
          )
        )

        const stagePublish = Effect.fn("Pnpm.stagePublish")(function*(options: {
          readonly tag: string
          readonly packages: ReadonlyArray<string>
          readonly dryRun?: boolean | undefined
        }) {
          if (options.packages.length === 0) return []
          const stdout = yield* pnpm([
            "stage",
            "publish",
            "-r",
            "--tag",
            options.tag,
            "--no-git-checks",
            "--json",
            ...(options.dryRun ? ["--dry-run"] : []),
            ...options.packages.flatMap((name) => ["--filter", name])
          ])
          const output = yield* decodeStagePublishOutput(stdout).pipe(
            Effect.mapError((cause) =>
              new ReleaseError({ message: `Unexpected output from pnpm stage publish: ${stdout.trim()}`, cause })
            )
          )
          return Object.entries(output).map(([key, summary]): StagedPackage => ({
            name: summary.name ?? key,
            version: summary.version,
            stageId: Option.fromUndefinedOr(summary.stageId)
          }))
        })

        return Pnpm.of({ dryRunPlan, applyVersions, stagePublish })
      })
    )
}
