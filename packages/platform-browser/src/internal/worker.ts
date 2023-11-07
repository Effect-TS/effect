import * as Worker from "@effect/platform/Worker"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"

const platformWorkerImpl = Worker.PlatformWorker.of({
  [Worker.PlatformWorkerTypeId]: Worker.PlatformWorkerTypeId,
  spawn<I, O>(worker_: unknown) {
    return Effect.gen(function*(_) {
      const worker = worker_ as globalThis.SharedWorker | globalThis.Worker
      let port: globalThis.Worker | MessagePort
      if ("port" in worker) {
        port = worker.port
        port.start()
      } else {
        port = worker
      }

      yield* _(Effect.addFinalizer(() => Effect.sync(() => port.postMessage([1]))))

      const queue = yield* _(Queue.unbounded<Worker.BackingWorker.Message<O>>())

      const fiber = yield* _(
        Effect.async<never, WorkerError, never>((resume, signal) => {
          port.addEventListener("message", function(event) {
            queue.unsafeOffer((event as MessageEvent).data)
          }, { signal })
          port.addEventListener("error", function(event) {
            resume(Effect.fail(WorkerError("unknown", (event as ErrorEvent).message)))
          }, { signal })
        }),
        Effect.interruptible,
        Effect.forkScoped
      )

      const send = (message: I, transfers?: ReadonlyArray<unknown>) =>
        Effect.sync(() => port.postMessage([0, message], transfers as any))

      return { fiber, queue, send }
    })
  }
})

/** @internal */
export const layerWorker = Layer.succeed(Worker.PlatformWorker, platformWorkerImpl)

/** @internal */
export const layerManager = Layer.provide(layerWorker, Worker.layerManager)

/** @internal */
export const makePool = Worker.makePool<globalThis.Worker | globalThis.SharedWorker>()

/** @internal */
export const makePoolLayer = Worker.makePoolLayer<globalThis.Worker | globalThis.SharedWorker>(layerManager)
