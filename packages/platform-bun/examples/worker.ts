import { Worker } from "@effect/platform"
import { BunRuntime, BunWorker } from "@effect/platform-bun"
import { Console, Context, Effect, Layer, Stream } from "effect"
import * as OS from "node:os"

class MyWorkerPool extends Context.Tag("@app/MyWorkerPool")<
  MyWorkerPool,
  Worker.WorkerPool<number, never, number>
>() {}

const PoolLive = Worker.makePoolLayer(MyWorkerPool, {
  size: OS.availableParallelism()
}).pipe(
  Layer.provide(BunWorker.layer(() => new globalThis.Worker(`${__dirname}/worker/range.ts`)))
)

Effect.gen(function*() {
  const pool = yield* MyWorkerPool
  yield* Effect.all([
    pool.execute(5).pipe(
      Stream.runForEach((_) => Console.log("worker 1", _))
    ),
    pool.execute(10).pipe(
      Stream.runForEach((_) => Console.log("worker 2", _))
    ),
    pool.execute(15).pipe(
      Stream.runForEach((_) => Console.log("worker 3", _))
    )
  ], { concurrency: "inherit" })
}).pipe(Effect.provide(PoolLive), BunRuntime.runMain)
