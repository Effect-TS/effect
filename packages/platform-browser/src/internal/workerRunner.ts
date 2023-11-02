import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>() {
    return Effect.gen(function*(_) {
      const port = "postMessage" in self ?
        self :
        (yield* _(Effect.async<never, never, MessagePort>((resume, signal) => {
          self.addEventListener("connect", function(event) {
            const port = (event as MessageEvent).ports[0]
            port.start()
            resume(Effect.succeed(port))
          }, { once: true, signal })
        })))
      const queue = yield* _(Queue.unbounded<I>())
      const fiberId = yield* _(Effect.fiberId)
      const fiber = yield* _(
        Effect.async<never, WorkerError, never>((resume, signal) => {
          port.addEventListener("message", function(event) {
            const message = (event as MessageEvent).data as Runner.BackingRunner.Message<I>
            if (message[0] === 0) {
              queue.unsafeOffer(message[1])
            } else {
              Effect.runFork(Queue.shutdown(queue))
            }
          }, { signal })
          port.addEventListener("messageerror", function(error) {
            resume(Effect.fail(WorkerError("decode", (error as ErrorEvent).message)))
          }, { signal })
          port.addEventListener("error", function(error) {
            resume(Effect.fail(WorkerError("unknown", (error as ErrorEvent).message)))
          }, { signal })
        }),
        Effect.forkDaemon
      )
      yield* _(Effect.addFinalizer(() => fiber.interruptAsFork(fiberId)))
      const send = (message: O, transfer?: ReadonlyArray<unknown>) =>
        Effect.sync(() =>
          port.postMessage([1, message], {
            transfer: transfer as any
          })
        )
      // ready
      port.postMessage([0])
      return { fiber, queue, send }
    })
  }
})

/** @internal */
export const layer = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)

/** @internal */
export const make = <I, R, E, O>(
  process: (request: I) => Stream.Stream<R, E, O>,
  options?: Runner.Runner.Options<O>
): Effect.Effect<Scope.Scope | R, WorkerError, never> => Effect.provide(Runner.make(process, options), layer)
