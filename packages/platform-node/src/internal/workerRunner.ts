import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberId from "effect/FiberId"
import * as FiberSet from "effect/FiberSet"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
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
          Effect.gen(function*() {
            const runtime = (yield* Effect.runtime<R | Scope.Scope>()).pipe(
              Runtime.updateContext(Context.omit(Scope.Scope))
            ) as Runtime.Runtime<R>
            const fiberSet = yield* FiberSet.make<any, WorkerError | E>()
            const runFork = Runtime.runFork(runtime)
            port.on("message", (message: Runner.BackingRunner.Message<I>) => {
              if (message[0] === 0) {
                FiberSet.unsafeAdd(fiberSet, runFork(restore(handler(0, message[1]))))
              } else {
                port.close()
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
            return (yield* restore(FiberSet.join(fiberSet))) as never
          }).pipe(Effect.scoped)
        )

      return { run, send }
    })
  }
})

/** @internal */
export const layer = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)
