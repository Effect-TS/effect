import { runMain } from "@effect/platform-node/Runtime"
import * as Worker from "@effect/platform-node/Worker"
import { Console, Context, Effect, Stream } from "effect"
import * as WT from "node:worker_threads"

interface MyWorkerPool {
  readonly _: unique symbol
}
const Pool = Context.Tag<MyWorkerPool, Worker.WorkerPool<number, never, number>>("@app/MyWorkerPool")
const PoolLive = Worker.makePoolLayer(Pool, {
  spawn: () => new WT.Worker("./examples/worker/range.ts"),
  minSize: 0,
  maxSize: 3,
  timeToLive: 30000
})

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
}).pipe(Effect.provide(PoolLive), runMain)
