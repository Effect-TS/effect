/**
 * Worker entry for `h2o.ts --workers=N`: a dataframe pool worker on a Node
 * worker thread.
 */
import { Parallel } from "effect/dataframe"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as WorkerRunner from "effect/workers/WorkerRunner"

/** @effect/platform-node's NodeWorkerRunner, loaded at run time (not a dependency of effect). */
const NodeWorkerRunner: { readonly layer: Layer.Layer<WorkerRunner.WorkerRunnerPlatform> } = await import(
  new URL("../../../platform/node/src/NodeWorkerRunner.ts", import.meta.url).href
)

await Effect.runPromise(Parallel.runWorker.pipe(Effect.provide(NodeWorkerRunner.layer)))
