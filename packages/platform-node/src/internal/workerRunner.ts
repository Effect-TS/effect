import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as WorkerThreads from "node:worker_threads"

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>() {
    return Effect.gen(function*() {
      if (!WorkerThreads.parentPort) {
        return yield* new WorkerError({ reason: "spawn", cause: new Error("not in a worker thread") })
      }
      const port = WorkerThreads.parentPort
      const send = (_portId: number, message: O, transfers?: ReadonlyArray<unknown>) =>
        Effect.sync(() => port.postMessage([1, message], transfers as any))
      const run = <A, E, R>(handler: (portId: number, message: I) => Effect.Effect<A, E, R>) =>
        Effect.uninterruptibleMask((restore) =>
          Scope.make().pipe(
            Effect.bindTo("scope"),
            Effect.bind("fiberSet", ({ scope }) => FiberSet.make<any, WorkerError | E>().pipe(Scope.extend(scope))),
            Effect.bind("runFork", ({ fiberSet }) => FiberSet.runtime(fiberSet)<R>()),
            Effect.tap(({ fiberSet, runFork }) => {
              port.on("message", (message: Runner.BackingRunner.Message<I>) => {
                if (message[0] === 0) {
                  runFork(restore(handler(0, message[1])))
                } else {
                  Deferred.unsafeDone(fiberSet.deferred, Exit.interrupt(FiberId.none))
                }
              })
              port.on("messageerror", (cause) => {
                Deferred.unsafeDone(fiberSet.deferred, new WorkerError({ reason: "decode", cause }))
              })
              port.on("error", (cause) => {
                Deferred.unsafeDone(fiberSet.deferred, new WorkerError({ reason: "unknown", cause }))
              })
              port.postMessage([0])
            }),
            Effect.flatMap(({ fiberSet, scope }) =>
              restore(FiberSet.join(fiberSet) as Effect.Effect<never, E | WorkerError>).pipe(
                Effect.ensuring(Scope.close(scope, Exit.void))
              )
            )
          )
        )

      return { run, send }
    })
  }
})

/** @internal */
export const layer = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)
