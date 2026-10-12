// The executor's platforms: one module per runtime, imported lazily (see ../Platform.ts).
import type * as WorkerRunner from "effect/workers/WorkerRunner"
import type * as Platform from "../Platform.ts"

/** What an executor needs from a platform: the worker runner it serves its protocol through. */
export type Services = WorkerRunner.WorkerRunnerPlatform

export const platforms: Platform.Imports<Services> = {
  node: () => import("./platform/node.ts"),
  bun: () => import("./platform/bun.ts"),
  deno: () => import("./platform/deno.ts")
}
