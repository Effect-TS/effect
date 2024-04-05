import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import * as WorkerThreads from "node:worker_threads"

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>(shutdown: Effect.Effect<void>) {
    return Effect.gen(function*(_) {
      if (!WorkerThreads.parentPort) {
        return yield* _(new WorkerError({ reason: "spawn", error: new Error("not in worker") }))
      }
      const port = WorkerThreads.parentPort
      const queue = yield* _(Queue.unbounded<readonly [portId: number, message: I]>())
      yield* _(
        Effect.async<never, WorkerError>((resume) => {
          port.on("message", (message: Runner.BackingRunner.Message<I>) => {
            if (message[0] === 0) {
              queue.unsafeOffer([0, message[1]])
            } else {
              Effect.runFork(shutdown)
            }
          })
          port.on("messageerror", (error) => {
            resume(new WorkerError({ reason: "decode", error }))
          })
          port.on("error", (error) => {
            resume(new WorkerError({ reason: "unknown", error }))
          })
        }),
        Effect.tapErrorCause((cause) => Cause.isInterruptedOnly(cause) ? Effect.void : Effect.logDebug(cause)),
        Effect.retry(Schedule.forever),
        Effect.annotateLogs({
          package: "@effect/platform-node",
          module: "WorkerRunner"
        }),
        Effect.interruptible,
        Effect.forkScoped
      )
      const send = (_portId: number, message: O, transfers?: ReadonlyArray<unknown>) =>
        Effect.sync(() => port.postMessage([1, message], transfers as any))
      // ready
      port.postMessage([0])
      return { queue, send }
    })
  }
})

/** @internal */
export const layer = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)
