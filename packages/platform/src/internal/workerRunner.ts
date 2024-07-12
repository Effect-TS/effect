import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as ExecutionStrategy from "effect/ExecutionStrategy"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Transferable from "../Transferable.js"
import type * as Worker from "../Worker.js"
import { isWorkerError, WorkerError } from "../WorkerError.js"
import type * as WorkerRunner from "../WorkerRunner.js"

/** @internal */
export const PlatformRunnerTypeId: WorkerRunner.PlatformRunnerTypeId = Symbol.for(
  "@effect/platform/Runner/PlatformRunner"
) as WorkerRunner.PlatformRunnerTypeId

/** @internal */
export const PlatformRunner = Context.GenericTag<WorkerRunner.PlatformRunner>(
  "@effect/platform/Runner/PlatformRunner"
)

/** @internal */
export const make = <I, E, R, O>(
  process: (request: I) => Stream.Stream<O, E, R> | Effect.Effect<O, E, R>,
  options?: WorkerRunner.Runner.Options<I, O, E>
) =>
  Effect.gen(function*(_) {
    const scope = yield* _(Scope.fork(yield* _(Effect.scope), ExecutionStrategy.parallel))
    const fiber = Option.getOrThrow(Fiber.getCurrentFiber())
    const shutdown = Effect.zipRight(
      Scope.close(scope, Exit.void),
      Fiber.interruptFork(fiber)
    )
    const platform = yield* _(PlatformRunner)
    const backing = yield* _(
      platform.start<Worker.Worker.Request<I>, Worker.Worker.Response<E>>(shutdown),
      Scope.extend(scope)
    )
    const fiberMap = new Map<number, Fiber.Fiber<void, unknown>>()

    yield* _(
      Queue.take(backing.queue),
      options?.decode ?
        Effect.flatMap((msg): Effect.Effect<readonly [portId: number, Worker.Worker.Request<I>], WorkerError> => {
          const req = msg[1]
          if (req[1] === 1) {
            return Effect.succeed(msg)
          }

          return Effect.map(options.decode!(req[2]), (data) => [msg[0], [req[0], req[1], data, req[3]]])
        }) :
        identity,
      Effect.tap(([portId, req]) => {
        const id = req[0]
        if (req[1] === 1) {
          const fiber = fiberMap.get(id)
          if (!fiber) return Effect.void
          return Fiber.interrupt(fiber)
        }

        const collector = Transferable.unsafeMakeCollector()
        return pipe(
          Effect.sync(() => process(req[2])),
          Effect.flatMap((stream) => {
            let effect = Effect.isEffect(stream) ?
              Effect.flatMap(stream, (data) => {
                const transfers = options?.transfers ? options.transfers(data) : []
                return pipe(
                  options?.encodeOutput
                    ? Effect.provideService(options.encodeOutput(req[2], data), Transferable.Collector, collector)
                    : Effect.succeed(data),
                  Effect.flatMap((payload) =>
                    backing.send(portId, [id, 0, [payload]], [
                      ...transfers,
                      ...collector.unsafeRead()
                    ])
                  )
                )
              }) :
              pipe(
                stream,
                Stream.chunks,
                Stream.tap((data) => {
                  if (options?.encodeOutput === undefined) {
                    const payload = Chunk.toReadonlyArray(data)
                    const transfers = options?.transfers ? payload.flatMap(options.transfers) : undefined
                    return backing.send(portId, [id, 0, payload], transfers)
                  }

                  const transfers: Array<unknown> = []
                  collector.unsafeClear()
                  return pipe(
                    Effect.forEach(data, (data) => {
                      if (options?.transfers) {
                        for (const option of options.transfers(data)) {
                          transfers.push(option)
                        }
                      }
                      return Effect.orDie(options.encodeOutput!(req[2], data))
                    }),
                    Effect.provideService(Transferable.Collector, collector),
                    Effect.flatMap((payload) => {
                      collector.unsafeRead().forEach((transfer) => transfers.push(transfer))
                      return backing.send(portId, [id, 0, payload], transfers)
                    })
                  )
                }),
                Stream.runDrain,
                Effect.andThen(backing.send(portId, [id, 1]))
              )

            if (req[3]) {
              const [traceId, spanId, sampled] = req[3]
              effect = Effect.withParentSpan(effect, {
                _tag: "ExternalSpan",
                traceId,
                spanId,
                sampled,
                context: Context.empty()
              })
            }

            return effect
          }),
          Effect.catchIf(isWorkerError, (error) =>
            backing.send(portId, [id, 3, WorkerError.encodeCause(Cause.fail(error))])),
          Effect.onExit((exit) => {
            if (exit._tag === "Success") {
              return Effect.void
            }
            return Either.match(Cause.failureOrCause(exit.cause), {
              onLeft: (error) => {
                const transfers = options?.transfers ? options.transfers(error) : []
                collector.unsafeClear()
                return pipe(
                  options?.encodeError
                    ? Effect.provideService(
                      options.encodeError(req[2], error),
                      Transferable.Collector,
                      collector
                    )
                    : Effect.succeed(error),
                  Effect.flatMap((payload) =>
                    backing.send(portId, [id, 2, payload as any], [
                      ...transfers,
                      ...collector.unsafeRead()
                    ])
                  ),
                  Effect.catchAllCause((cause) =>
                    backing.send(portId, [id, 3, WorkerError.encodeCause(cause)])
                  )
                )
              },
              onRight: (cause) => backing.send(portId, [id, 3, WorkerError.encodeCause(cause)])
            })
          }),
          Effect.ensuring(Effect.sync(() => fiberMap.delete(id))),
          Effect.fork,
          Effect.tap((fiber) => Effect.sync(() => fiberMap.set(id, fiber)))
        )
      }),
      Effect.forever,
      Effect.forkIn(scope)
    )
  })

/** @internal */
export const layer = <I, E, R, O>(
  process: (request: I) => Stream.Stream<O, E, R> | Effect.Effect<O, E, R>,
  options?: WorkerRunner.Runner.Options<I, O, E>
): Layer.Layer<never, WorkerError, WorkerRunner.PlatformRunner | R> => Layer.scopedDiscard(make(process, options))

/** @internal */
export const makeSerialized = <
  R,
  I,
  A extends Schema.TaggedRequest.Any,
  const Handlers extends WorkerRunner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<A, I, R>,
  handlers: Handlers
): Effect.Effect<
  void,
  WorkerError,
  | R
  | WorkerRunner.PlatformRunner
  | Scope.Scope
  | WorkerRunner.SerializedRunner.HandlersContext<Handlers>
> =>
  Effect.gen(function*(_) {
    const scope = yield* _(Effect.scope)
    let context = Context.empty() as Context.Context<any>
    const parseRequest = Schema.decodeUnknown(schema) as (_: unknown) => Effect.Effect<A>

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
      decode(message) {
        return Effect.mapError(
          parseRequest(message),
          (error) => new WorkerError({ reason: "decode", error })
        )
      },
      encodeError(request, message) {
        return Effect.mapError(
          Serializable.serializeFailure(request as any, message),
          (error) => new WorkerError({ reason: "encode", error })
        )
      },
      encodeOutput(request, message) {
        return Effect.catchAllCause(
          Serializable.serializeSuccess(request as any, message),
          (error) => new WorkerError({ reason: "encode", error })
        )
      }
    }))
  }) as any

/** @internal */
export const layerSerialized = <
  R,
  I,
  A extends Schema.TaggedRequest.Any,
  const Handlers extends WorkerRunner.SerializedRunner.Handlers<A>
>(
  schema: Schema.Schema<A, I, R>,
  handlers: Handlers
): Layer.Layer<
  never,
  WorkerError,
  | R
  | WorkerRunner.PlatformRunner
  | WorkerRunner.SerializedRunner.HandlersContext<Handlers>
> => Layer.scopedDiscard(makeSerialized(schema, handlers))
