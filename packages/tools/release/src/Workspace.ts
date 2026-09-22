import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Schema from "effect/Schema"
// The published effect package exports this public barrel, not its source modules.
// oxlint-disable-next-line effect/no-import-from-barrel-package
import { ChildProcessSpawner } from "effect/unstable/process"
import { ReleaseError } from "./Errors.ts"
import { findWorkspaceRoot, runCommandOk } from "./Process.ts"

export interface WorkspacePackage {
  readonly name: string
  /** The version currently written in the package manifest. */
  readonly version: string
  /** Workspace-relative directory, e.g. `packages/effect`. */
  readonly dir: string
  readonly private: boolean
}

/** `pnpm -r ls --depth -1 --json`; the workspace root has no name and is dropped. */
const ListOutput = Schema.fromJsonString(
  Schema.Array(
    Schema.Struct({
      name: Schema.optionalKey(Schema.String),
      version: Schema.optionalKey(Schema.String),
      path: Schema.String,
      private: Schema.optionalKey(Schema.Boolean)
    })
  )
)

const decodeListOutput = Schema.decodeUnknownEffect(ListOutput)

/**
 * The pnpm workspace as seen from the repository root. The implementation
 * reads `pnpm -r ls --depth -1 --json` and never touches the registry.
 */
export class Workspace extends Context.Service<Workspace, {
  readonly packages: Effect.Effect<ReadonlyArray<WorkspacePackage>, ReleaseError>
}>()("@effect/release/Workspace") {
  static readonly layer: Layer.Layer<
    Workspace,
    never,
    FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
  > = Layer
    .effect(
      Workspace,
      Effect.gen(function*() {
        const path = yield* Path.Path
        const root = yield* findWorkspaceRoot.pipe(Effect.orDie)
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

        const packages = runCommandOk("pnpm", ["-r", "ls", "--depth", "-1", "--json"], { cwd: root }).pipe(
          Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
          Effect.flatMap((stdout) =>
            decodeListOutput(stdout).pipe(
              Effect.mapError((cause) =>
                new ReleaseError({ message: `Unexpected output from pnpm -r ls --json: ${stdout.trim()}`, cause })
              )
            )
          ),
          Effect.flatMap((entries) =>
            Effect.forEach(entries, (entry) => {
              if (entry.name === undefined) return Effect.succeed(undefined)
              if (entry.version === undefined) {
                return new ReleaseError({ message: `Workspace package ${entry.name} has no version` })
              }
              return Effect.succeed({
                name: entry.name,
                version: entry.version,
                dir: path.relative(root, entry.path),
                private: entry.private === true
              })
            }).pipe(
              Effect.map((packages) => packages.filter((pkg): pkg is WorkspacePackage => pkg !== undefined))
            )
          )
        )

        return Workspace.of({ packages })
      })
    )
}
