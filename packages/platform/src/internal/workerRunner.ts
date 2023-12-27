import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Fiber from "effect/Fiber"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Transferable from "../Transferable.js"
import type * as Worker from "../Worker.js"
import * as WorkerError from "../WorkerError.js"
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
  options?: WorkerRunner.Runner.Options<I, E, O>
) =>
  Effect.gen(function*(_) {
    const platform = yield* _(PlatformRunner)
    const backing = yield* _(platform.start<Worker.Worker.Request<I>, Worker.Worker.Response<E>>())
    const fiberMap = new Map<number, Fiber.Fiber<never, void>>()

    yield* _(
      Queue.take(backing.queue),
      options?.decode ?
        Effect.flatMap((req): Effect.Effect<never, WorkerError.WorkerError, Worker.Worker.Request<I>> => {
          if (req[1] === 1) {
            return Effect.succeed(req)
          }

          return Effect.map(options.decode!(req[2]), (data) => [req[0], req[1], data])
        }) :
        identity,
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
                onLeft: (error) => {
                  const transfers = options?.transfers ? options.transfers(error) : undefined
                  return pipe(
                    options?.encodeError ? options.encodeError(req[2], error) : Effect.succeed(error),
                    Effect.flatMap((payload) => backing.send([id, 2, payload as any], transfers)),
                    Effect.catchAllCause((cause) => backing.send([id, 3, Cause.squash(cause)]))
                  )
                },
                onRight: (cause) => backing.send([id, 3, Cause.squash(cause)])
              }),
            onSuccess: (data) => {
              const transfers = options?.transfers ? options.transfers(data) : undefined
              return pipe(
                options?.encodeOutput ? options.encodeOutput(req[2], data) : Effect.succeed(data),
                Effect.flatMap((payload) => backing.send([id, 0, [payload]], transfers)),
                Effect.catchAllCause((cause) => backing.send([id, 3, Cause.squash(cause)]))
              )
            }
          }) :
          pipe(
            stream,
            Stream.chunks,
            Stream.tap((data) => {
              if (options?.encodeOutput === undefined) {
                const payload = Chunk.toReadonlyArray(data)
                const transfers = options?.transfers ? payload.flatMap(options.transfers) : undefined
                return backing.send([id, 0, payload], transfers)
              }

              const transfers: Array<unknown> = []
              return Effect.flatMap(
                Effect.forEach(data, (data) => {
                  if (options?.transfers) {
                    transfers.push(...options.transfers(data))
                  }
                  return Effect.orDie(options.encodeOutput!(req[2], data))
                }),
                (payload) => backing.send([id, 0, payload], transfers)
              )
            }),
            Stream.runDrain,
            Effect.matchCauseEffect({
              onFailure: (cause) =>
                Either.match(Cause.failureOrCause(cause), {
                  onLeft: (error) => {
                    const transfers = options?.transfers ? options.transfers(error) : undefined
                    return pipe(
                      options?.encodeError ? options.encodeError(req[2], error) : Effect.succeed(error),
                      Effect.flatMap((payload) => backing.send([id, 2, payload as any], transfers)),
                      Effect.catchAllCause((cause) => backing.send([id, 3, Cause.squash(cause)]))
                    )
                  },
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
      Effect.forever,
      Effect.forkScoped
    )
  })

/** @internal */
export const layer = <I, R, E, O>(
  process: (request: I) => Stream.Stream<R, E, O> | Effect.Effect<R, E, O>,
  options?: WorkerRunner.Runner.Options<I, E, O>
): Layer.Layer<WorkerRunner.PlatformRunner | R, WorkerError.WorkerError, never> =>
  Layer.scopedDiscard(make(process, options))

/** @internal */
export const makeSerialized = <
  I,
  A extends Schema.TaggedRequest.Any,
  const Handlers extends WorkerRunner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<I, A>,
  handlers: Handlers
): Effect.Effect<
  | WorkerRunner.PlatformRunner
  | Scope.Scope
  | WorkerRunner.SerializedRunner.HandlersContext<Handlers>,
  WorkerError.WorkerError,
  void
> =>
  Effect.gen(function*(_) {
    const scope = yield* _(Effect.scope)
    let context = Context.empty() as Context.Context<any>
    const parseRequest = Schema.parse(schema)

    return yield* _(make((request: A) => {
      const result = (handlers as any)[request._tag](request)
      if (Layer.isLayer(result)) {
        return Effect.flatMap(Layer.buildWithScope(result, scope), (_) =>
          Effect.sync(() => {
            context = Context.merge(context, _)
          }))
      } else if (Effect.isEffect(result)) {
        return Effect.provide(result, context)
      }
      return Stream.provideContext(result as any, context)
    }, {
      transfers(message) {
        return Transferable.get(message)
      },
      decode(message) {
        return Effect.mapError(
          parseRequest(message),
          (error) => WorkerError.WorkerError("decode", error)
        )
      },
      encodeError(request, message) {
        return Effect.mapError(
          Serializable.serializeFailure(request as any, message),
          (error) => WorkerError.WorkerError("encode", error)
        )
      },
      encodeOutput(request, message) {
        return Effect.mapError(
          Serializable.serializeSuccess(request as any, message),
          (error) => WorkerError.WorkerError("encode", error)
        )
      }
    }))
  }) as any

/** @internal */
export const layerSerialized = <
  I,
  A extends Schema.TaggedRequest.Any,
  const Handlers extends WorkerRunner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<I, A>,
  handlers: Handlers
): Layer.Layer<
  | WorkerRunner.PlatformRunner
  | WorkerRunner.SerializedRunner.HandlersContext<Handlers>,
  WorkerError.WorkerError,
  never
> => Layer.scopedDiscard(makeSerialized(schema, handlers))
