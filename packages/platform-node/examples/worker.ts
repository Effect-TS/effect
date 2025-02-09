import { Worker } from "@effect/platform"
import { NodeRuntime, NodeWorker } from "@effect/platform-node"
import { Console, Context, Effect, Layer, Stream } from "effect"
import * as WT from "node:worker_threads"

interface MyWorkerPool {
  readonly _: unique symbol
}
const Pool = Context.GenericTag<MyWorkerPool, Worker.WorkerPool<number, never, number>>("@app/MyWorkerPool")
const PoolLive = Worker.makePoolLayer(Pool, { size: 3 }).pipe(
  Layer.provide(NodeWorker.layer(() => tsWorker("./worker/range.ts")))
)

Effect.gen(function*() {
  const pool = yield* Pool
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
}).pipe(Effect.provide(PoolLive), NodeRuntime.runMain)

const tsWorker = (path: string) => {
  const url = new URL(path, import.meta.url)
  return new WT.Worker(`import('tsx/esm/api').then(({ register }) => { register(); import('${url.pathname}') })`, {
    eval: true
  })
}
