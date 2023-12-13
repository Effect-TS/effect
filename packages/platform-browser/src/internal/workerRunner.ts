import { WorkerError } from "@effect/platform/WorkerError"
import * as Runner from "@effect/platform/WorkerRunner"
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
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
      const fiber = yield* _(
        Effect.async<never, WorkerError, never>((resume) => {
          function onMessage(event: MessageEvent) {
            const message = (event as MessageEvent).data as Runner.BackingRunner.Message<I>
            if (message[0] === 0) {
              queue.unsafeOffer(message[1])
            } else {
              Effect.runFork(Queue.shutdown(queue))
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
