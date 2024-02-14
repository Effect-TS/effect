import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>(shutdown: Effect.Effect<void>) {
    return Effect.gen(function*(_) {
      const port = "postMessage" in self ?
        self :
        (yield* _(Effect.async<MessagePort, never, never>((resume, signal) => {
          self.addEventListener("connect", function(event) {
            const port = (event as MessageEvent).ports[0]
            port.start()
            resume(Effect.succeed(port))
          }, { once: true, signal })
        })))
      const queue = yield* _(Queue.unbounded<I>())
      yield* _(
        Effect.async<never, WorkerError, never>((resume) => {
          function onMessage(event: MessageEvent) {
            const message = (event as MessageEvent).data as Runner.BackingRunner.Message<I>
            if (message[0] === 0) {
              queue.unsafeOffer(message[1])
            } else {
              Effect.runFork(shutdown)
            }
          }
          function onMessageError(error: ErrorEvent) {
            resume(new WorkerError({ reason: "decode", error: error.error ?? error.message }))
          }
          function onError(error: ErrorEvent) {
            resume(new WorkerError({ reason: "unknown", error: error.error ?? error.message }))
          }
          port.addEventListener("message", onMessage as any)
          port.addEventListener("messageerror", onMessageError as any)
          port.addEventListener("error", onError as any)
          return Effect.sync(() => {
            port.removeEventListener("message", onMessage as any)
            port.removeEventListener("messageerror", onMessageError as any)
            port.removeEventListener("error", onError as any)
          })
        }),
        Effect.tapErrorCause((cause) => Cause.isInterruptedOnly(cause) ? Effect.unit : Effect.logDebug(cause)),
        Effect.retry(Schedule.forever),
        Effect.annotateLogs({
          package: "@effect/platform-browser",
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
