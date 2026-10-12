// The runtime platform (Node, Bun or Deno). Entry points call `runMain`, which loads only
// the current runtime's platform module and hands the program over to that platform's own
// `runMain`. Nothing else in the test runner depends on a specific runtime, and this module
// depends on nothing else in the test runner.
import type { Crypto } from "effect/Crypto"
import * as Effect from "effect/Effect"
import type { FileSystem } from "effect/FileSystem"
import type * as Layer from "effect/Layer"
import type { Path } from "effect/Path"
import type { ChildProcessSpawner } from "effect/process/ChildProcessSpawner"
import type { Stdio } from "effect/Stdio"
import type { Terminal } from "effect/Terminal"
import type * as Worker from "effect/workers/Worker"
import type * as WorkerRunner from "effect/workers/WorkerRunner"

export type Runtime = "node" | "bun" | "deno"

/**
 * What a platform provides to every entry point: the runtime's standard services (the
 * same set as `NodeServices`, `BunServices` and `DenoServices`), the spawner the
 * coordinator uses to start executors, and the worker runner an executor serves its
 * protocol through. Each entry point uses what it needs; the rest is never started.
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
  | WorkerRunner.WorkerRunnerPlatform

export interface Platform {
  readonly runtime: Runtime
  readonly layer: Layer.Layer<Services>
  readonly runMain: <E, A>(effect: Effect.Effect<A, E>) => void
}

/**
 * URL of the module at `path` (no extension) relative to `base`, with the extension `base`
 * itself was loaded with: `.ts` when running from source, `.js` once built. The build
 * rewrites `.ts` in `import()` specifiers, but not in plain file URLs like this one.
 */
export const moduleUrl = (path: string, base: string): URL =>
  new URL(`${path}${base.endsWith(".ts") ? ".ts" : ".js"}`, base)

export const detect = (): Runtime => "Bun" in globalThis ? "bun" : "Deno" in globalThis ? "deno" : "node"

/** The current runtime's platform. Only its module is imported. */
export const load: Effect.Effect<Platform> = Effect.suspend(() => {
  switch (detect()) {
    case "bun":
      return Effect.promise(() => import("./platform/bun.ts"))
    case "deno":
      return Effect.promise(() => import("./platform/deno.ts"))
    case "node":
      return Effect.promise(() => import("./platform/node.ts"))
  }
}).pipe(Effect.map((module) => module.platform))

/**
 * Loads the current runtime's platform, then hands `main`, with the platform's layer
 * provided, over to that platform's `runMain` (signal handling, exit codes, error
 * reporting). If loading itself fails, the cause is logged and the process exits with 1.
 */
export const runMain = <A, E>(main: Effect.Effect<A, E, Services>): void => {
  Effect.runFork(
    load.pipe(
      Effect.flatMap((platform) => Effect.sync(() => platform.runMain(Effect.provide(main, platform.layer)))),
      Effect.tapCause((cause) =>
        Effect.andThen(Effect.logError(cause), Effect.sync(() => (globalThis.process.exitCode = 1)))
      )
    )
  )
}
