import * as Worker from "@effect/platform/Worker"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
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
          Effect.tap(Option.match({
            onNone: () => Effect.sync(() => port.terminate()),
            onSome: (_) => Effect.unit
          }))
        )
      ))

      const queue = yield* _(Queue.unbounded<Worker.BackingWorker.Message<O>>())

      const fiber = yield* _(
        Effect.async<never, WorkerError, never>((resume, signal) => {
          port.addEventListener("message", function(event) {
            queue.unsafeOffer(event.data)
          }, { signal })
          port.addEventListener("error", function(event) {
            resume(Effect.fail(WorkerError("unknown", event.message)))
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
export const makePool = Worker.makePool<globalThis.Worker>()

/** @internal */
export const makePoolLayer = Worker.makePoolLayer<globalThis.Worker>(layerManager)
