// The runtime platform (Node, Bun or Deno). Entry points (`bin.ts`, `executor-worker.ts`)
// detect the runtime and load only that platform's module, so nothing else in the
// test runner depends on a specific runtime.
import type * as Command from "effect/cli/Command"
import type * as Effect from "effect/Effect"
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

export const load = async (runtime: Runtime = detect()): Promise<Platform> => {
  switch (runtime) {
    case "bun":
      return (await import("./platform/bun.ts")).platform
    case "deno":
      return (await import("./platform/deno.ts")).platform
    case "node":
      return (await import("./platform/node.ts")).platform
  }
}
