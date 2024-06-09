import { Worker } from "@effect/platform"
import { BunRuntime, BunWorker } from "@effect/platform-bun"
import { Console, Context, Effect, Layer, Stream } from "effect"
import * as OS from "node:os"
import * as path from "node:path"

interface MyWorkerPool {
  readonly _: unique symbol
}

const Pool = Context.GenericTag<MyWorkerPool, Worker.WorkerPool<number, never, number>>("@app/MyWorkerPool")
const workerPath = path.resolve(__dirname, "./worker/range.ts")
const PoolLive = Worker.makePoolLayer(Pool, {
  size: OS.availableParallelism()
}).pipe(
  Layer.provide(BunWorker.layer(() => new globalThis.Worker(workerPath)))
)

Effect.gen(function*(_) {
  const pool = yield* _(Pool)
  yield* _(
    Effect.all([
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
  )
}).pipe(Effect.provide(PoolLive), BunRuntime.runMain)
