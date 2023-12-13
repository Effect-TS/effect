import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Transferable from "../Transferable.js"
import type * as Worker from "../Worker.js"
import type * as WorkerError from "../WorkerError.js"
import type * as WorkerRunner from "../WorkerRunner.js"

/** @internal */
export const PlatformRunnerTypeId: WorkerRunner.PlatformRunnerTypeId = Symbol.for(
  "@effect/platform/Runner/PlatformRunner"
) as WorkerRunner.PlatformRunnerTypeId

/** @internal */
export const PlatformRunner = Context.Tag<WorkerRunner.PlatformRunner>(
  PlatformRunnerTypeId
)

/** @internal */
export const make = <I, R, E, O>(
  process: (request: I) => Stream.Stream<R, E, O> | Effect.Effect<R, E, O>,
  options?: WorkerRunner.Runner.Options<O>
) =>
  Effect.gen(function*(_) {
    const platform = yield* _(PlatformRunner)
    const backing = yield* _(platform.start<Worker.Worker.Request<I>, Worker.Worker.Response<E>>())
    const fiberMap = new Map<number, Fiber.Fiber<never, void>>()

    const handleRequests = pipe(
      Queue.take(backing.queue),
      Effect.tap((req) => {
        const id = req[0]
        if (req[1] === 1) {
          const fiber = fiberMap.get(id)
          if (!fiber) return Effect.unit
          return Fiber.interrupt(fiber)
        }

        const stream = process(req[2])

        const effect = Effect.isEffect(stream) ?
          Effect.matchCauseEffect(stream, {
            onFailure: (cause) =>
              Either.match(Cause.failureOrCause(cause), {
                onLeft: (error) => backing.send([id, 2, error]),
                onRight: (cause) => backing.send([id, 3, Cause.squash(cause)])
              }),
            onSuccess: (data) => {
              const transfers = options?.transfers ? options.transfers(data) : undefined
              const payload = options?.encode ? options.encode(data) : data
              return backing.send([id, 1, payload], transfers)
            }
          }) :
          pipe(
            stream,
            Stream.tap((item) => {
              const transfers = options?.transfers ? options.transfers(item) : undefined
              const payload = options?.encode ? options.encode(item) : item
              return backing.send([id, 0, payload], transfers)
            }),
            Stream.runDrain,
            Effect.matchCauseEffect({
              onFailure: (cause) =>
                Either.match(Cause.failureOrCause(cause), {
                  onLeft: (error) => backing.send([id, 2, error]),
                  onRight: (cause) => backing.send([id, 3, Cause.squash(cause)])
                }),
              onSuccess: () => backing.send([id, 1])
            })
          )

        return pipe(
          effect,
          Effect.ensuring(Effect.sync(() => fiberMap.delete(id))),
          Effect.fork,
          Effect.tap((fiber) => Effect.sync(() => fiberMap.set(id, fiber)))
        )
      }),
      Effect.forever
    )

    return yield* _(
      Effect.all([
        handleRequests,
        Fiber.join(backing.fiber)
      ], { concurrency: "unbounded", discard: true }) as Effect.Effect<R, WorkerError.WorkerError, never>
    )
  })

/** @internal */
export const makeSerialized = <
  I,
  A extends Schema.TaggedRequest.Any,
  const Handlers extends {
    readonly [K in A["_tag"]]: Extract<A, { readonly _tag: K }> extends
      Serializable.SerializableWithResult<infer _IS, infer S, infer _IE, infer E, infer _IO, infer O>
      ? (_: S) => Stream.Stream<any, E, O> | Effect.Effect<any, E, O> :
      never
  }
>(
  schema: Schema.Schema<I, A>,
  handlers: Handlers
): Effect.Effect<
  | WorkerRunner.PlatformRunner
  | Scope.Scope
  | (ReturnType<Handlers[keyof Handlers]> extends Stream.Stream<infer R, infer _E, infer _A> ? R : never),
  WorkerError.WorkerError,
  never
> => {
  const parseRequest = Schema.decode(schema)
  const effectTags = new Set<string>()
  return make((request: I) => {
    if (Predicate.hasProperty(request, "_tag") && effectTags.has(request._tag as string)) {
      return Effect.flatMap(parseRequest(request), (request: A) => {
        const handler =
          (handlers as unknown as Record<string, (req: unknown) => Effect.Effect<never, any, any>>)[request._tag]
        if (!handler) {
          return Effect.dieMessage(`No handler for ${request._tag}`)
        }
        const encodeSuccess = Schema.encode(Serializable.successSchema(request as any))
        return pipe(
          Effect.matchEffect(handler(request), {
            onFailure: (error) => Effect.flatMap(Serializable.serializeFailure(request as any, error), Effect.fail),
            onSuccess: encodeSuccess
          })
        )
      })
    }

    return Stream.flatMap(parseRequest(request), (request: A) => {
      const handler =
        (handlers as unknown as Record<string, (req: unknown) => Stream.Stream<never, any, any>>)[request._tag]
      if (!handler) {
        return Stream.dieMessage(`No handler for ${request._tag}`)
      }
      const encodeSuccess = Schema.encode(Serializable.successSchema(request as any))
      const stream = handler(request)
      if (Effect.isEffect(stream)) {
        effectTags.add(request._tag)
      }
      return pipe(
        stream,
        Stream.catchAll((error) => Effect.flatMap(Serializable.serializeFailure(request as any, error), Effect.fail)),
        Stream.mapEffect(encodeSuccess)
      )
    })
  }, {
    transfers(message) {
      return Transferable.get(message)
    }
  })
}
