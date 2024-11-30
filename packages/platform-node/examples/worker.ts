import { Worker } from "@effect/platform"
import { NodeRuntime, NodeWorker } from "@effect/platform-node"
import type { WorkerError } from "@effect/platform/WorkerError"
import { Console, Context, Effect, Fiber, Layer, Stream } from "effect"
import type { RuntimeFiber } from "effect/Fiber"
import * as WT from "node:worker_threads"

interface MyWorkerPool {
  readonly _: unique symbol
}
const Pool = Context.GenericTag<MyWorkerPool, RuntimeFiber<Worker.WorkerPool<number, never, number>, WorkerError>>(
  "@app/MyWorkerPool"
)
const PoolLive = Layer.scoped(
  Pool,
  Worker.makePool<number, never, number>({ size: 3 }).pipe(
    Effect.forkScoped // use forkDaemon here to actually receive the error and have the process die
  )
).pipe(
  Layer.provide(NodeWorker.layer(() => tsWorker("./worker/range.ts")))
)

Effect.gen(function*() {
  const pool = yield* Fiber.join(yield* Pool)
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
}).pipe(
  Effect.provide(Layer.mergeAll(PoolLive, Layer.effectDiscard(Effect.die("hello").pipe(Effect.delay(100))))),
  NodeRuntime.runMain
)

const tsWorker = (path: string) => {
  const url = new URL(path, import.meta.url)
  return new WT.Worker(`import('tsx/esm/api').then(({ register }) => { register(); import('${url.pathname}') })`, {
    eval: true
  })
}
