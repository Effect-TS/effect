import * as Worker from "@effect/platform/Worker"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

const platformWorkerImpl = Worker.makePlatform<globalThis.SharedWorker | globalThis.Worker | MessagePort>()({
  setup({ scope, worker }) {
    const port = "port" in worker ? worker.port : worker
    return Effect.as(
      Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          port.postMessage([1])
        })
      ),
      port
    )
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
    port.addEventListener("message", onMessage as any)
    port.addEventListener("error", onError as any)
    if ("start" in port) {
      port.start()
    }
    return Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        port.removeEventListener("message", onMessage as any)
        port.removeEventListener("error", onError as any)
      })
    )
  }
})

/** @internal */
export const layerWorker = Layer.succeed(Worker.PlatformWorker, platformWorkerImpl)

/** @internal */
export const layerManager = Layer.provide(Worker.layerManager, layerWorker)

/** @internal */
export const layer = (spawn: (id: number) => globalThis.Worker | globalThis.SharedWorker | MessagePort) =>
  Layer.merge(layerManager, Worker.layerSpawner(spawn))

/** @internal */
export const layerPlatform = (spawn: (id: number) => globalThis.Worker | globalThis.SharedWorker | MessagePort) =>
  Layer.merge(layerWorker, Worker.layerSpawner(spawn))
