import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import type * as Schema from "@effect/schema/Schema"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Schedule from "effect/Schedule"
import type * as Stream from "effect/Stream"

declare const self: Worker

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>(shutdown: Effect.Effect<never, never, void>) {
    return Effect.gen(function*(_) {
      if (!("postMessage" in self)) {
        return yield* _(Effect.die("not in a worker"))
      }
      const port = self
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
          function onError(error: ErrorEvent) {
            resume(Effect.fail(WorkerError("unknown", error.message, error.error?.stack)))
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
export const layerPlatform = Layer.succeed(Runner.PlatformRunner, platformRunnerImpl)

/** @internal */
export const layer = <I, R, E, O>(
  process: (request: I) => Stream.Stream<R, E, O>,
  options?: Runner.Runner.Options<I, E, O>
): Layer.Layer<R, WorkerError, never> => Layer.provide(Runner.layer(process, options), layerPlatform)

/** @internal */
export const layerSerialized = <
  A extends Schema.TaggedRequest.Any,
  I,
  R,
  Handlers extends Runner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<A, I, R>,
  handlers: Handlers
): Layer.Layer<
  R | Runner.SerializedRunner.HandlersContext<Handlers>,
  WorkerError,
  never
> => Layer.provide(Runner.layerSerialized(schema, handlers), layerPlatform)
