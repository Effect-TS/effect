import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as Schema from "effect/Schema"
import { ChildProcessSpawner } from "effect/unstable/process/ChildProcessSpawner"
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
  static readonly layer: Layer.Layer<Workspace, never, FileSystem.FileSystem | Path.Path | ChildProcessSpawner> = Layer
    .effect(
      Workspace,
      Effect.gen(function*() {
        const path = yield* Path.Path
        const root = yield* findWorkspaceRoot.pipe(Effect.orDie)
        const spawner = yield* ChildProcessSpawner

        const packages = runCommandOk("pnpm", ["-r", "ls", "--depth", "-1", "--json"], { cwd: root }).pipe(
          Effect.provideService(ChildProcessSpawner, spawner),
          Effect.flatMap((stdout) =>
            decodeListOutput(stdout).pipe(
              Effect.mapError((cause) =>
                new ReleaseError({ message: `Unexpected output from pnpm -r ls --json: ${stdout.trim()}`, cause })
              )
            )
          ),
          Effect.map((entries) =>
            entries.flatMap((entry): ReadonlyArray<WorkspacePackage> =>
              entry.name !== undefined && entry.version !== undefined
                ? [{
                  name: entry.name,
                  version: entry.version,
                  dir: path.relative(root, entry.path),
                  private: entry.private === true
                }]
                : []
            )
          )
        )

        return Workspace.of({ packages })
      })
    )
}
