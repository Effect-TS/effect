import { WorkerRunner } from "@effect/platform"
import { NodeRuntime, NodeWorkerRunner } from "@effect/platform-node"
import { Effect, Layer, Stream } from "effect"

const WorkerLive = Effect.gen(function*(_) {
  yield* _(WorkerRunner.make((n: number) => Stream.range(0, n)))
  yield* _(Effect.log("worker started"))
  yield* _(Effect.addFinalizer(() => Effect.log("worker closed")))
}).pipe(Layer.scopedDiscard, Layer.provide(NodeWorkerRunner.layer))

NodeRuntime.runMain(Layer.launch(WorkerLive))
