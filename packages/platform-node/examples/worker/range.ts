import { WorkerRunner } from "@effect/platform"
import { NodeRuntime, NodeWorkerRunner } from "@effect/platform-node"
import { Effect, Layer, Stream } from "effect"

const WorkerLive = Effect.gen(function*() {
  yield* WorkerRunner.make((n: number) => Stream.range(0, n))
  yield* Effect.log("worker started")
  yield* Effect.addFinalizer(() => Effect.log("worker closed"))
}).pipe(Layer.scopedDiscard, Layer.provide(NodeWorkerRunner.layer))

NodeRuntime.runMain(NodeWorkerRunner.launch(WorkerLive))
