import * as Worker from "@effect/platform/Worker"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import type * as WorkerThreads from "node:worker_threads"

const platformWorkerImpl = Worker.PlatformWorker.of({
  [Worker.PlatformWorkerTypeId]: Worker.PlatformWorkerTypeId,
  spawn<I, O>(worker_: unknown) {
    return Effect.gen(function*(_) {
      const worker = worker_ as WorkerThreads.Worker
      yield* _(Effect.addFinalizer(() =>
        pipe(
          Effect.async<never, never, void>((resume) => {
            worker.once("exit", () => {
              resume(Effect.unit)
            })
            worker.postMessage([1])
          }),
          Effect.timeout(5000),
          Effect.tap(Option.match({
            onNone: () => Effect.promise(() => worker.terminate()),
            onSome: (_) => Effect.unit
          }))
        )
      ))
      const queue = yield* _(Queue.unbounded<Worker.BackingWorker.Message<O>>())
      yield* _(Effect.addFinalizer(() => Queue.shutdown(queue)))
      const fiber = yield* _(
        Effect.async<never, WorkerError, never>((resume) => {
          worker.on("message", (message: Worker.BackingWorker.Message<O>) => {
            queue.unsafeOffer(message)
          })
          worker.on("messageerror", (error) => {
            resume(Effect.fail(WorkerError("decode", error.message, error.stack)))
          })
          worker.on("error", (error) => {
            resume(Effect.fail(WorkerError("unknown", error.message, error.stack)))
          })
          worker.on("exit", (code) => {
            resume(Effect.fail(WorkerError("unknown", new Error(`exited with code ${code}`))))
          })
        }),
        Effect.forkScoped
      )
      const send = (message: I, transfers?: ReadonlyArray<unknown>) =>
        Effect.try({
          try: () => worker.postMessage([0, message], transfers as any),
          catch: (error) => WorkerError("send", (error as any).message, (error as any).stack)
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
export const makePool = Worker.makePool<WorkerThreads.Worker>()

/** @internal */
export const makePoolLayer = Worker.makePoolLayer<WorkerThreads.Worker>(layerManager)

/** @internal */
export const makePoolSerialized = Worker.makePoolSerialized<WorkerThreads.Worker>()

/** @internal */
export const makePoolSerializedLayer = Worker.makePoolSerializedLayer<WorkerThreads.Worker>(
  layerManager
)
