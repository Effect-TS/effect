// The runtime platform (Node, Bun or Deno). Entry points (`bin.ts`, `executor-worker.ts`)
// call `runMain`, which loads only the current runtime's platform module and hands the
// program over to that platform's own `runMain`. Nothing else in the test runner depends
// on a specific runtime.
import type * as Command from "effect/cli/Command"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Worker from "effect/workers/Worker"
import type * as WorkerRunner from "effect/workers/WorkerRunner"

export type Runtime = "node" | "bun" | "deno"

export interface Platform {
  readonly runtime: Runtime
  /** Services the CLI needs, plus the spawner the coordinator uses to start executors. */
  readonly layer: Layer.Layer<Command.Environment | Worker.WorkerPlatform | Worker.Spawner>
  /** For an executor: serves the executor protocol to the coordinator that spawned it. */
  readonly workerRunner: Layer.Layer<WorkerRunner.WorkerRunnerPlatform>
  readonly runMain: <E, A>(effect: Effect.Effect<A, E>) => void
}

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
 * Loads the current runtime's platform, then hands `main` over to that platform's
 * `runMain` (signal handling, exit codes, error reporting). If loading itself fails,
 * the cause is logged and the process exits with 1.
 */
export const runMain = <A, E>(main: (platform: Platform) => Effect.Effect<A, E>): void => {
  Effect.runFork(
    load.pipe(
      Effect.flatMap((platform) => Effect.sync(() => platform.runMain(main(platform)))),
      Effect.tapCause((cause) =>
        Effect.andThen(Effect.logError(cause), Effect.sync(() => (globalThis.process.exitCode = 1)))
      )
    )
  )
}
