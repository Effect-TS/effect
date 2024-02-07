import { BunRuntime, BunWorkerRunner } from "@effect/platform-bun"
import * as Runner from "@effect/platform/WorkerRunner"
import { Effect, Layer, Stream } from "effect"

const WorkerLive = Effect.gen(function*(_) {
  yield* _(Runner.make((n: number) => Stream.range(0, n)))
  yield* _(Effect.log("worker started"))
  yield* _(Effect.addFinalizer(() => Effect.log("worker closed")))
}).pipe(Layer.scopedDiscard, Layer.provide(BunWorkerRunner.layer))

BunRuntime.runMain(Layer.launch(WorkerLive))
