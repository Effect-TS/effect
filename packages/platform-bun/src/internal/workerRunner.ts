import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"

declare const self: Worker

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>(shutdown: Effect.Effect<void>) {
    return Effect.gen(function*(_) {
      if (!("postMessage" in self)) {
        return yield* _(Effect.die("not in a worker"))
      }
      const port = self
      const queue = yield* _(Queue.unbounded<I>())
      yield* _(
        Effect.async<never, WorkerError>((resume) => {
          function onMessage(event: MessageEvent) {
            const message = (event as MessageEvent).data as Runner.BackingRunner.Message<I>
            if (message[0] === 0) {
              queue.unsafeOffer(message[1])
            } else {
              Effect.runFork(shutdown)
            }
          }
          function onError(error: ErrorEvent) {
            resume(new WorkerError({ reason: "unknown", error: error.error ?? error.message }))
          }
          port.addEventListener("message", onMessage)
          port.addEventListener("error", onError)
          return Effect.sync(() => {
            port.removeEventListener("message", onMessage)
            port.removeEventListener("error", onError)
          })
        }),
        Effect.tapErrorCause((cause) => Cause.isInterruptedOnly(cause) ? Effect.unit : Effect.logDebug(cause)),
        Effect.retry(Schedule.forever),
        Effect.annotateLogs({
          package: "@effect/platform-bun",
          module: "WorkerRunner"
        }),
        Effect.interruptible,
        Effect.forkScoped
      )
      const send = (message: O, transfer?: ReadonlyArray<unknown>) =>
        Effect.sync(() =>
          port.postMessage([1, message], {
            transfer: transfer as any
          })
        )
      // ready
      port.postMessage([0])
      return { queue, send }
    })
  }
})

/** @internal */
export const layer = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)
