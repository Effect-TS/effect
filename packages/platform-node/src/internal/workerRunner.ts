import * as Runtime from "@effect/platform/Runtime"
import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import type * as Schema from "@effect/schema/Schema"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Stream from "effect/Stream"
import * as WorkerThreads from "node:worker_threads"

const platformRunnerImpl = Runner.PlatformRunner.of({
  [Runner.PlatformRunnerTypeId]: Runner.PlatformRunnerTypeId,
  start<I, O>() {
    return Effect.gen(function*(_) {
      if (!WorkerThreads.parentPort) {
        return yield* _(Effect.fail(WorkerError("spawn", "not in worker")))
      }
      const port = WorkerThreads.parentPort
      const queue = yield* _(Queue.unbounded<I>())
      yield* _(
        Effect.async<never, WorkerError, never>((resume) => {
          port.on("message", (message: Runner.BackingRunner.Message<I>) => {
            if (message[0] === 0) {
              queue.unsafeOffer(message[1])
            } else {
              Effect.runFork(Effect.flatMap(Effect.fiberId, Runtime.interruptAll))
            }
          })
          port.on("messageerror", (error) => {
            resume(Effect.fail(WorkerError("decode", error.message, error.stack)))
          })
          port.on("error", (error) => {
            resume(Effect.fail(WorkerError("unknown", error.message, error.stack)))
          })
        }),
        Effect.tapErrorCause((cause) => Cause.isInterruptedOnly(cause) ? Effect.unit : Effect.logDebug(cause)),
        Effect.retryWhile(() => true),
        Effect.annotateLogs({
          package: "@effect/platform-node",
          module: "WorkerRunner"
        }),
        Effect.forkScoped
      )
      const send = (message: O, transfers?: ReadonlyArray<unknown>) =>
        Effect.sync(() => port.postMessage([1, message], transfers as any))
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
  Handlers extends Runner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<I, A>,
  handlers: Handlers
): Layer.Layer<
  Runner.SerializedRunner.HandlersContext<Handlers>,
  WorkerError,
  never
> => Layer.provide(Runner.layerSerialized(schema, handlers), layerPlatform)
