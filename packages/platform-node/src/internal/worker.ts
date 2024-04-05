import * as Worker from "@effect/platform/Worker"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as WorkerThreads from "node:worker_threads"

const platformWorkerImpl = Worker.PlatformWorker.of({
  [Worker.PlatformWorkerTypeId]: Worker.PlatformWorkerTypeId,
  spawn<I, O>(worker_: unknown) {
    return Effect.gen(function*(_) {
      const worker = worker_ as WorkerThreads.Worker
      yield* _(Effect.addFinalizer(() =>
        pipe(
          Effect.async<void>((resume) => {
            worker.once("exit", () => {
              resume(Effect.void)
            })
            worker.postMessage([1])
          }),
          Effect.timeout(5000),
          Effect.orElse(() => Effect.sync(() => worker.terminate()))
        )
      ))
      const queue = yield* _(Queue.unbounded<Worker.BackingWorker.Message<O>>())
      yield* _(Effect.addFinalizer(() => Queue.shutdown(queue)))
      const fiber = yield* _(
        Effect.async<never, WorkerError>((resume) => {
          worker.on("message", (message: Worker.BackingWorker.Message<O>) => {
            queue.unsafeOffer(message)
          })
          worker.on("messageerror", (error) => {
            resume(new WorkerError({ reason: "decode", error }))
          })
          worker.on("error", (error) => {
            resume(new WorkerError({ reason: "unknown", error }))
          })
          worker.on("exit", (code) => {
            resume(new WorkerError({ reason: "unknown", error: new Error(`exited with code ${code}`) }))
          })
        }),
        Effect.interruptible,
        Effect.forkScoped
      )
      const send = (message: I, transfers?: ReadonlyArray<unknown>) =>
        Effect.try({
          try: () => worker.postMessage([0, message], transfers as any),
          catch: (error) => new WorkerError({ reason: "send", error })
        })
      return { fiber, queue, send }
    })
  }
})

/** @internal */
export const layerWorker = Layer.succeed(Worker.PlatformWorker, platformWorkerImpl)

/** @internal */
export const layerManager = Layer.provide(Worker.layerManager, layerWorker)

/** @internal */
export const layer = (spawn: (id: number) => WorkerThreads.Worker) =>
  Layer.merge(
    layerManager,
    Worker.layerSpawner(spawn)
  )
