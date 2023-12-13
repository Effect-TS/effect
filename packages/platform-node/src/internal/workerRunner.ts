import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
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
      const fiber = yield* _(
        Effect.async<never, WorkerError, never>((resume) => {
          port.on("message", (message: Runner.BackingRunner.Message<I>) => {
            if (message[0] === 0) {
              queue.unsafeOffer(message[1])
            } else {
              Effect.runFork(Queue.shutdown(queue))
            }
          })
          port.on("messageerror", (error) => {
            resume(Effect.fail(WorkerError("decode", error.message, error.stack)))
          })
          port.on("error", (error) => {
            resume(Effect.fail(WorkerError("unknown", error.message, error.stack)))
          })
        }),
        Effect.forkScoped
      )
      const send = (message: O, transfers?: ReadonlyArray<unknown>) =>
        Effect.sync(() => port.postMessage([1, message], transfers as any))
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

/** @internal */
export const makeSerialized = <
  I,
  A extends Schema.TaggedRequest.Any,
  Handlers extends {
    readonly [K in A["_tag"]]: Extract<A, { readonly _tag: K }> extends
      Serializable.SerializableWithResult<infer _IS, infer S, infer _IE, infer E, infer _IO, infer O>
      ? (_: S) => Stream.Stream<any, E, O> | Effect.Effect<any, E, O> :
      never
  }
>(
  schema: Schema.Schema<I, A>,
  handlers: Handlers
): Effect.Effect<
  | Scope.Scope
  | (ReturnType<Handlers[keyof Handlers]> extends Stream.Stream<infer R, infer _E, infer _A> ? R : never),
  WorkerError,
  never
> => Effect.provide(Runner.makeSerialized(schema, handlers), layer)
