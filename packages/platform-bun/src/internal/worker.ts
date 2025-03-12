import * as Worker from "@effect/platform/Worker"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

const platformWorkerImpl = Worker.makePlatform<globalThis.Worker>()({
  setup({ scope, worker }) {
    return Effect.flatMap(Deferred.make<void>(), (closeDeferred) => {
      worker.addEventListener("close", () => {
        Deferred.unsafeDone(closeDeferred, Exit.void)
      })
      return Effect.as(
        Scope.addFinalizer(
          scope,
          Effect.suspend(() => {
            worker.postMessage([1])
            return Deferred.await(closeDeferred)
          }).pipe(
            Effect.interruptible,
            Effect.timeout(5000),
            Effect.catchAllCause(() => Effect.sync(() => worker.terminate()))
          )
        ),
        worker
      )
    })
  },
  listen({ deferred, emit, port, scope }) {
    function onMessage(event: MessageEvent) {
      emit(event.data)
    }
    function onError(event: ErrorEvent) {
      Deferred.unsafeDone(
        deferred,
        new WorkerError({ reason: "unknown", cause: event.error ?? event.message })
      )
    }
    port.addEventListener("message", onMessage)
    port.addEventListener("error", onError)
    return Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        port.removeEventListener("message", onMessage)
        port.removeEventListener("error", onError)
      })
    )
  }
})

/** @internal */
export const layerWorker = Layer.succeed(Worker.PlatformWorker, platformWorkerImpl)

/** @internal */
export const layerManager = Layer.provide(Worker.layerManager, layerWorker)

/** @internal */
export const layer = (spawn: (id: number) => globalThis.Worker) =>
  Layer.merge(
    layerManager,
    Worker.layerSpawner(spawn)
  )

/** @internal */
export const layerPlatform = (spawn: (id: number) => globalThis.Worker) =>
  Layer.merge(layerWorker, Worker.layerSpawner(spawn))
