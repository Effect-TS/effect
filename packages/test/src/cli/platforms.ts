// The CLI's platforms: one module per runtime, imported lazily (see ../Platform.ts).
import type { Crypto } from "effect/Crypto"
import type { FileSystem } from "effect/FileSystem"
import type { Path } from "effect/Path"
import type { ChildProcessSpawner } from "effect/process/ChildProcessSpawner"
import type { Stdio } from "effect/Stdio"
import type { Terminal } from "effect/Terminal"
import type * as Worker from "effect/workers/Worker"
import type * as Platform from "../Platform.ts"

/**
 * What the CLI needs from a platform: the runtime's standard services (the same set as
 * `NodeServices`, `BunServices` and `DenoServices`) and the spawner the coordinator uses
 * to start executors.
 */
export type Services =
  | ChildProcessSpawner
  | Crypto
  | FileSystem
  | Path
  | Stdio
  | Terminal
  | Worker.WorkerPlatform
  | Worker.Spawner

export const platforms: Platform.Imports<Services> = {
  node: () => import("./platform/node.ts"),
  bun: () => import("./platform/bun.ts"),
  deno: () => import("./platform/deno.ts")
}
