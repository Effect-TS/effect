import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
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
export const CloseLatch = Context.Reference<WorkerRunner.CloseLatch>()("@effect/platform/WorkerRunner/CloseLatch", {
  defaultValue: () => Deferred.unsafeMake<void, WorkerError>(FiberId.none)
})

/** @internal */
export const layerCloseLatch = Layer.effect(CloseLatch, Deferred.make())

/** @internal */
export const make = Effect.fnUntraced(function*<I, E, R, O>(
  process: (request: I) => Stream.Stream<O, E, R> | Effect.Effect<O, E, R>,
  options?: WorkerRunner.Runner.Options<I, O, E>
) {
  const fiber = yield* Effect.withFiberRuntime<Fiber.RuntimeFiber<void>>(Effect.succeed as any)
  const platform = yield* PlatformRunner
  const closeLatch = yield* CloseLatch
  const backing = yield* platform.start<Worker.Worker.Request<I>, Worker.Worker.Response<E>>(closeLatch)
  const fiberMap = new Map<number, Fiber.Fiber<unknown, unknown>>()

  yield* Deferred.await(closeLatch).pipe(
    Effect.onExit(() => {
      fiber.currentScheduler.scheduleTask(() => {
        fiber.unsafeInterruptAsFork(fiber.id())
      }, 0)
      return Effect.void
    }),
    Effect.forkScoped
  )

  yield* backing.run((portId, [id, kind, data, span]): Effect.Effect<void, WorkerError, R> => {
    if (kind === 1) {
      const fiber = fiberMap.get(id)
      if (!fiber) return Effect.void
      return Fiber.interrupt(fiber)
    }

    return Effect.withFiberRuntime<I, WorkerError>((fiber) => {
      fiberMap.set(id, fiber)
      return options?.decode ? options.decode(data) : Effect.succeed(data)
    }).pipe(
      Effect.flatMap((input) => {
        const collector = Transferable.unsafeMakeCollector()
        const stream = process(input)
        let effect = Effect.isEffect(stream) ?
          Effect.flatMap(stream, (out) =>
            pipe(
              options?.encodeOutput
                ? Effect.provideService(options.encodeOutput(input, out), Transferable.Collector, collector)
                : Effect.succeed(out),
              Effect.flatMap((payload) => backing.send(portId, [id, 0, [payload]], collector.unsafeRead()))
            )) :
          pipe(
            stream,
            Stream.runForEachChunk((chunk) => {
              if (options?.encodeOutput === undefined) {
                const payload = Chunk.toReadonlyArray(chunk)
                return backing.send(portId, [id, 0, payload])
              }

              collector.unsafeClear()
              return pipe(
                Effect.forEach(chunk, (data) => options.encodeOutput!(input, data)),
                Effect.provideService(Transferable.Collector, collector),
                Effect.flatMap((payload) => backing.send(portId, [id, 0, payload], collector.unsafeRead()))
              )
            }),
            Effect.andThen(backing.send(portId, [id, 1]))
          )

        if (span) {
          effect = Effect.withParentSpan(effect, {
            _tag: "ExternalSpan",
            traceId: span[0],
            spanId: span[1],
            sampled: span[2],
            context: Context.empty()
          })
        }

        return Effect.uninterruptibleMask((restore) =>
          restore(effect).pipe(
            Effect.catchIf(
              isWorkerError,
              (error) => backing.send(portId, [id, 3, WorkerError.encodeCause(Cause.fail(error))])
            ),
            Effect.catchAllCause((cause) =>
              Either.match(Cause.failureOrCause(cause), {
                onLeft: (error) => {
                  collector.unsafeClear()
                  return pipe(
                    options?.encodeError
                      ? Effect.provideService(
                        options.encodeError(input, error),
                        Transferable.Collector,
                        collector
                      )
                      : Effect.succeed(error),
                    Effect.flatMap((payload) => backing.send(portId, [id, 2, payload as any], collector.unsafeRead())),
                    Effect.catchAllCause((cause) => backing.send(portId, [id, 3, WorkerError.encodeCause(cause)]))
                  )
                },
                onRight: (cause) => backing.send(portId, [id, 3, WorkerError.encodeCause(cause)])
              })
            )
          )
        )
      }),
      Effect.ensuring(Effect.sync(() => fiberMap.delete(id)))
    )
  })
})

/** @internal */
export const layer = <I, E, R, O>(
  process: (request: I) => Stream.Stream<O, E, R> | Effect.Effect<O, E, R>,
  options?: WorkerRunner.Runner.Options<I, O, E>
): Layer.Layer<never, WorkerError, WorkerRunner.PlatformRunner | R> =>
  Layer.scopedDiscard(make(process, options)).pipe(
    Layer.provide(layerCloseLatch)
  )

/** @internal */
export const makeSerialized = <
  R,
  I,
  A extends Schema.TaggedRequest.All,
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
  Effect.gen(function*() {
    const scope = yield* Effect.scope
    let context = Context.empty() as Context.Context<any>
    const parseRequest = Schema.decodeUnknown(schema) as (_: unknown) => Effect.Effect<A>

    return yield* make((request: A) => {
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
          (cause) => new WorkerError({ reason: "decode", cause })
        )
      },
      encodeError(request, message) {
        return Effect.mapError(
          Schema.serializeFailure(request as any, message),
          (cause) => new WorkerError({ reason: "encode", cause })
        )
      },
      encodeOutput(request, message) {
        return Effect.catchAllCause(
          Schema.serializeSuccess(request as any, message),
          (cause) => new WorkerError({ reason: "encode", cause })
        )
      }
    })
  }) as any

/** @internal */
export const layerSerialized = <
  R,
  I,
  A extends Schema.TaggedRequest.All,
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
> => Layer.scopedDiscard(makeSerialized(schema, handlers)).pipe(Layer.provide(layerCloseLatch))

/** @internal */
export const launch = <A, E, R>(layer: Layer.Layer<A, E, R>): Effect.Effect<void, E | WorkerError, R> =>
  Effect.scopedWith(Effect.fnUntraced(function*(scope) {
    const context = yield* Layer.buildWithScope(Layer.provideMerge(layer, layerCloseLatch), scope)
    const closeLatch = Context.get(context, CloseLatch)
    return yield* Deferred.await(closeLatch)
  }))
