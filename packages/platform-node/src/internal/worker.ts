import * as Worker from "@effect/platform/Worker"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import type * as ChildProcess from "node:child_process"
import type * as WorkerThreads from "node:worker_threads"

const platformWorkerImpl = Worker.makePlatform<WorkerThreads.Worker>()({
  setup({ scope, worker }) {
    return Effect.flatMap(Deferred.make<void, WorkerError>(), (exitDeferred) => {
      worker.on("exit", () => {
        Deferred.unsafeDone(exitDeferred, Exit.void)
      })
      return Effect.as(
        Scope.addFinalizer(
          scope,
          Effect.suspend(() => {
            worker.postMessage([1])
            return Deferred.await(exitDeferred)
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
  listen({ deferred, emit, port }) {
    port.on("message", (message) => {
      emit(message)
    })
    port.on("messageerror", (cause) => {
      Deferred.unsafeDone(
        deferred,
        new WorkerError({ reason: "decode", cause })
      )
    })
    port.on("error", (cause) => {
      Deferred.unsafeDone(deferred, new WorkerError({ reason: "unknown", cause }))
    })
    port.on("exit", (code) => {
      Deferred.unsafeDone(
        deferred,
        new WorkerError({ reason: "unknown", cause: new Error(`exited with code ${code}`) })
      )
    })
    return Effect.void
  }
})

const platformWorkerImplCP = Worker.makePlatform<ChildProcess.ChildProcess>()({
  setup({ scope, worker }) {
    return Effect.flatMap(Deferred.make<void, WorkerError>(), (exitDeferred) => {
      worker.on("exit", () => {
        Deferred.unsafeDone(exitDeferred, Exit.void)
      })
      return Effect.as(
        Scope.addFinalizer(
          scope,
          Effect.suspend(() => {
            worker.send([1])
            return Deferred.await(exitDeferred)
          }).pipe(
            Effect.interruptible,
            Effect.timeout(5000),
            Effect.catchAllCause(() => Effect.sync(() => worker.kill("SIGKILL")))
          )
        ),
        {
          postMessage(msg: any, t: any) {
            return worker.send(msg, t)
          },
          worker
        }
      )
    })
  },
  listen({ deferred, emit, port }) {
    port.worker.on("message", (message) => {
      emit(message)
    })
    port.worker.on("error", (cause) => {
      Deferred.unsafeDone(deferred, new WorkerError({ reason: "unknown", cause }))
    })
    port.worker.on("exit", (code) => {
      Deferred.unsafeDone(
        deferred,
        new WorkerError({ reason: "unknown", cause: new Error(`exited with code ${code}`) })
      )
    })
    return Effect.void
  }
})

/** @internal */
export const layerWorker = Layer.succeed(Worker.PlatformWorker, platformWorkerImpl)

/** @internal */
export const layerWorkerChildProcess = Layer.succeed(Worker.PlatformWorker, platformWorkerImplCP)

/** @internal */
export const layerManager = Layer.provide(Worker.layerManager, layerWorker)

/** @internal */
export const layerManagerChildProcess = Layer.provide(Worker.layerManager, layerWorkerChildProcess)

/** @internal */
export const layer = (spawn: (id: number) => WorkerThreads.Worker) =>
  Layer.merge(
    layerManager,
    Worker.layerSpawner(spawn)
  )

/** @internal */
export const layerChildProcess = (spawn: (id: number) => ChildProcess.ChildProcess) =>
  Layer.merge(
    layerManagerChildProcess,
    Worker.layerSpawner(spawn)
  )

/** @internal */
export const layerPlatform = (spawn: (id: number) => WorkerThreads.Worker) =>
  Layer.merge(layerWorker, Worker.layerSpawner(spawn))

/** @internal */
export const layerPlatformChildProcess = (spawn: (id: number) => ChildProcess.ChildProcess) =>
  Layer.merge(layerWorkerChildProcess, Worker.layerSpawner(spawn))
