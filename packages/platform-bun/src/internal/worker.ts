import * as Worker from "@effect/platform/Worker"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"

const platformWorkerImpl = Worker.PlatformWorker.of({
  [Worker.PlatformWorkerTypeId]: Worker.PlatformWorkerTypeId,
  spawn<I, O>(worker_: unknown) {
    return Effect.gen(function*(_) {
      const port = worker_ as globalThis.Worker

      yield* _(Effect.addFinalizer(() =>
        pipe(
          Effect.async<never, never, void>((resume, signal) => {
            port.addEventListener("close", () => resume(Effect.unit), { once: true, signal })
            port.postMessage([1])
          }),
          // TODO: make configurable
          // sometimes bun doesn't fire the close event
          Effect.timeout(1000),
          Effect.orElse(() => Effect.sync(() => port.terminate()))
        )
      ))

      const queue = yield* _(Queue.unbounded<Worker.BackingWorker.Message<O>>())

      const fiber = yield* _(
        Effect.async<never, WorkerError, never>((resume) => {
          function onMessage(event: MessageEvent) {
            queue.unsafeOffer((event as MessageEvent).data)
          }
          function onError(event: ErrorEvent) {
            resume(Effect.fail(WorkerError("unknown", event.message, event.error?.stack)))
          }
          port.addEventListener("message", onMessage)
          port.addEventListener("error", onError)
          return Effect.sync(() => {
            port.removeEventListener("message", onMessage)
            port.removeEventListener("error", onError)
          })
        }),
        Effect.forkScoped
      )

      const send = (message: I, transfers?: ReadonlyArray<unknown>) =>
        Effect.try({
          try: () => port.postMessage([0, message], transfers as any),
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
export const makePool = Worker.makePool<globalThis.Worker>()

/** @internal */
export const makePoolLayer = Worker.makePoolLayer<globalThis.Worker>(layerManager)

/** @internal */
export const makePoolSerialized = Worker.makePoolSerialized<globalThis.Worker>()

/** @internal */
export const makePoolSerializedLayer = Worker.makePoolSerializedLayer<globalThis.Worker>(
  layerManager
)
