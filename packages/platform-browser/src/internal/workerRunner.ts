import * as Runtime from "@effect/platform/Runtime"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import type * as Schema from "@effect/schema/Schema"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Stream from "effect/Stream"
import type { WorkerRunner } from "../index.js"

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
      yield* _(
        Effect.async<never, WorkerError, never>((resume) => {
          function onMessage(event: MessageEvent) {
            const message = (event as MessageEvent).data as Runner.BackingRunner.Message<I>
            if (message[0] === 0) {
              queue.unsafeOffer(message[1])
            } else {
              Effect.runFork(Effect.flatMap(Effect.fiberId, Runtime.interruptAll))
            }
          }
          function onMessageError(error: ErrorEvent) {
            resume(Effect.fail(WorkerError("decode", error.message, error.error?.stack)))
          }
          function onError(error: ErrorEvent) {
            resume(Effect.fail(WorkerError("unknown", error.message, error.error?.stack)))
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
        Effect.retryWhile(() => true),
        Effect.annotateLogs({
          package: "@effect/platform-browser",
          module: "WorkerRunner"
        }),
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
export const layerPlatform = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)

/** @internal */
export const layer = <I, R, E, O>(
  process: (request: I) => Stream.Stream<R, E, O>,
  options?: Runner.Runner.Options<I, E, O>
): Layer.Layer<R, WorkerError, never> => Layer.provide(Runner.layer(process, options), layerPlatform)

/** @internal */
export const layerSerialized = <
  I,
  A extends Schema.TaggedRequest.Any,
  Handlers extends WorkerRunner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<I, A>,
  handlers: Handlers
): Layer.Layer<
  WorkerRunner.SerializedRunner.HandlersContext<Handlers>,
  WorkerError,
  never
> => Layer.provide(Runner.layerSerialized(schema, handlers), layerPlatform)
