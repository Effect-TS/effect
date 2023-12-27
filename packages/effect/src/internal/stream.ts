import * as Cause from "../Cause.js"
import type * as Channel from "../Channel.js"
import * as Chunk from "../Chunk.js"
import * as Clock from "../Clock.js"
import * as Context from "../Context.js"
import * as Deferred from "../Deferred.js"
import * as Duration from "../Duration.js"
import * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import * as Equal from "../Equal.js"
import * as Exit from "../Exit.js"
import * as Fiber from "../Fiber.js"
import { constTrue, dual, identity, pipe } from "../Function.js"
import type { LazyArg } from "../Function.js"
import * as Layer from "../Layer.js"
import * as MergeDecision from "../MergeDecision.js"
import * as Option from "../Option.js"
import type * as Order from "../Order.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty, isTagged, type Predicate, type Refinement } from "../Predicate.js"
import * as PubSub from "../PubSub.js"
import * as Queue from "../Queue.js"
import * as Ref from "../Ref.js"
import * as Runtime from "../Runtime.js"
import * as Schedule from "../Schedule.js"
import * as Scope from "../Scope.js"
import type * as Sink from "../Sink.js"
import type * as Stream from "../Stream.js"
import type * as Emit from "../StreamEmit.js"
import * as HaltStrategy from "../StreamHaltStrategy.js"
import type * as Take from "../Take.js"
import type * as Tracer from "../Tracer.js"
import * as Tuple from "../Tuple.js"
import * as channel from "./channel.js"
import * as channelExecutor from "./channel/channelExecutor.js"
import * as MergeStrategy from "./channel/mergeStrategy.js"
import * as singleProducerAsyncInput from "./channel/singleProducerAsyncInput.js"
import * as core from "./core-stream.js"
import { RingBuffer } from "./ringBuffer.js"
import * as _sink from "./sink.js"
import * as DebounceState from "./stream/debounceState.js"
import * as emit from "./stream/emit.js"
import * as haltStrategy from "./stream/haltStrategy.js"
import * as Handoff from "./stream/handoff.js"
import * as HandoffSignal from "./stream/handoffSignal.js"
import * as pull from "./stream/pull.js"
import * as SinkEndReason from "./stream/sinkEndReason.js"
import * as ZipAllState from "./stream/zipAllState.js"
import * as ZipChunksState from "./stream/zipChunksState.js"
import * as _take from "./take.js"

/** @internal */
const StreamSymbolKey = "effect/Stream"

/** @internal */
export const StreamTypeId: Stream.StreamTypeId = Symbol.for(
  StreamSymbolKey
) as Stream.StreamTypeId

/** @internal */
const streamVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export class StreamImpl<out R, out E, out A> implements Stream.Stream<R, E, A> {
  readonly [StreamTypeId] = streamVariance
  constructor(
    readonly channel: Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown>
  ) {
  }

  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isStream = (u: unknown): u is Stream.Stream<unknown, unknown, unknown> =>
  hasProperty(u, StreamTypeId) || Effect.isEffect(u)

/** @internal */
export const DefaultChunkSize = 4096

/** @internal */
export const accumulate = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, E, Chunk.Chunk<A>> =>
  chunks(accumulateChunks(self))

/** @internal */
export const accumulateChunks = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, E, A> => {
  const accumulator = (
    s: Chunk.Chunk<A>
  ): Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, void> =>
    core.readWith({
      onInput: (input: Chunk.Chunk<A>) => {
        const next = Chunk.appendAll(s, input)
        return core.flatMap(
          core.write(next),
          () => accumulator(next)
        )
      },
      onFailure: core.fail,
      onDone: () => core.unit
    })
  return new StreamImpl(core.pipeTo(toChannel(self), accumulator(Chunk.empty())))
}

/** @internal */
export const acquireRelease = <R, E, A, R2, _>(
  acquire: Effect.Effect<R, E, A>,
  release: (resource: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, _>
): Stream.Stream<R | R2, E, A> => scoped(Effect.acquireRelease(acquire, release))

/** @internal */
export const aggregate = dual<
  <R2, E2, A, A2, B>(
    sink: Sink.Sink<R2, E2, A | A2, A2, B>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, B>,
  <R, E, R2, E2, A, A2, B>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>
  ) => Stream.Stream<R2 | R, E2 | E, B>
>(
  2,
  <R, E, R2, E2, A, A2, B>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>
  ): Stream.Stream<R | R2, E | E2, B> => aggregateWithin(self, sink, Schedule.forever)
)

/** @internal */
export const aggregateWithin = dual<
  <R2, E2, A, A2, B, R3, C>(
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R3 | R, E2 | E, B>,
  <R, E, R2, E2, A, A2, B, R3, C>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ) => Stream.Stream<R2 | R3 | R, E2 | E, B>
>(
  3,
  <R, E, R2, E2, A, A2, B, R3, C>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): Stream.Stream<R | R2 | R3, E | E2, B> =>
    filterMap(
      aggregateWithinEither(self, sink, schedule),
      (_) =>
        Either.match(_, {
          onLeft: Option.none,
          onRight: Option.some
        })
    )
)

/** @internal */
export const aggregateWithinEither = dual<
  <R2, E2, A, A2, B, R3, C>(
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R3 | R, E2 | E, Either.Either<C, B>>,
  <R, E, R2, E2, A, A2, B, R3, C>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ) => Stream.Stream<R2 | R3 | R, E2 | E, Either.Either<C, B>>
>(
  3,
  <R, E, R2, E2, A, A2, B, R3, C>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): Stream.Stream<R | R2 | R3, E | E2, Either.Either<C, B>> => {
    const layer = Effect.all([
      Handoff.make<HandoffSignal.HandoffSignal<E | E2, A>>(),
      Ref.make<SinkEndReason.SinkEndReason>(SinkEndReason.ScheduleEnd),
      Ref.make(Chunk.empty<A | A2>()),
      Schedule.driver(schedule),
      Ref.make(false),
      Ref.make(false)
    ])
    return pipe(
      fromEffect(layer),
      flatMap(([handoff, sinkEndReason, sinkLeftovers, scheduleDriver, consumed, endAfterEmit]) => {
        const handoffProducer: Channel.Channel<never, E | E2, Chunk.Chunk<A>, unknown, never, never, unknown> = core
          .readWithCause({
            onInput: (input: Chunk.Chunk<A>) =>
              core.flatMap(
                core.fromEffect(pipe(
                  handoff,
                  Handoff.offer<HandoffSignal.HandoffSignal<E | E2, A>>(HandoffSignal.emit(input)),
                  Effect.when(() => Chunk.isNonEmpty(input))
                )),
                () => handoffProducer
              ),
            onFailure: (cause) =>
              core.fromEffect(
                Handoff.offer<HandoffSignal.HandoffSignal<E | E2, A>>(
                  handoff,
                  HandoffSignal.halt(cause)
                )
              ),
            onDone: () =>
              core.fromEffect(
                Handoff.offer<HandoffSignal.HandoffSignal<E | E2, A>>(
                  handoff,
                  HandoffSignal.end(SinkEndReason.UpstreamEnd)
                )
              )
          })
        const handoffConsumer: Channel.Channel<never, unknown, unknown, unknown, E | E2, Chunk.Chunk<A | A2>, void> =
          pipe(
            Ref.getAndSet(sinkLeftovers, Chunk.empty()),
            Effect.flatMap((leftovers) => {
              if (Chunk.isNonEmpty(leftovers)) {
                return pipe(
                  Ref.set(consumed, true),
                  Effect.zipRight(Effect.succeed(pipe(
                    core.write(leftovers),
                    core.flatMap(() => handoffConsumer)
                  )))
                )
              }
              return pipe(
                Handoff.take(handoff),
                Effect.map((signal) => {
                  switch (signal._tag) {
                    case HandoffSignal.OP_EMIT: {
                      return pipe(
                        core.fromEffect(Ref.set(consumed, true)),
                        channel.zipRight(core.write(signal.elements)),
                        channel.zipRight(core.fromEffect(Ref.get(endAfterEmit))),
                        core.flatMap((bool) => bool ? core.unit : handoffConsumer)
                      )
                    }
                    case HandoffSignal.OP_HALT: {
                      return core.failCause(signal.cause)
                    }
                    case HandoffSignal.OP_END: {
                      if (signal.reason._tag === SinkEndReason.OP_SCHEDULE_END) {
                        return pipe(
                          Ref.get(consumed),
                          Effect.map((bool) =>
                            bool ?
                              core.fromEffect(
                                pipe(
                                  Ref.set(sinkEndReason, SinkEndReason.ScheduleEnd),
                                  Effect.zipRight(Ref.set(endAfterEmit, true))
                                )
                              ) :
                              pipe(
                                core.fromEffect(
                                  pipe(
                                    Ref.set(sinkEndReason, SinkEndReason.ScheduleEnd),
                                    Effect.zipRight(Ref.set(endAfterEmit, true))
                                  )
                                ),
                                core.flatMap(() => handoffConsumer)
                              )
                          ),
                          channel.unwrap
                        )
                      }
                      return pipe(
                        Ref.set<SinkEndReason.SinkEndReason>(sinkEndReason, signal.reason),
                        Effect.zipRight(Ref.set(endAfterEmit, true)),
                        core.fromEffect
                      )
                    }
                  }
                })
              )
            }),
            channel.unwrap
          )
        const timeout = (lastB: Option.Option<B>): Effect.Effect<R2 | R3, Option.Option<never>, C> =>
          scheduleDriver.next(lastB)
        const scheduledAggregator = (
          sinkFiber: Fiber.RuntimeFiber<E | E2, readonly [Chunk.Chunk<Chunk.Chunk<A | A2>>, B]>,
          scheduleFiber: Fiber.RuntimeFiber<Option.Option<never>, C>,
          scope: Scope.Scope
        ): Channel.Channel<R2 | R3, unknown, unknown, unknown, E | E2, Chunk.Chunk<Either.Either<C, B>>, unknown> => {
          const forkSink = pipe(
            Ref.set(consumed, false),
            Effect.zipRight(Ref.set(endAfterEmit, false)),
            Effect.zipRight(
              pipe(
                handoffConsumer,
                channel.pipeToOrFail(_sink.toChannel(sink)),
                core.collectElements,
                channelExecutor.run,
                Effect.forkIn(scope)
              )
            )
          )
          const handleSide = (
            leftovers: Chunk.Chunk<Chunk.Chunk<A | A2>>,
            b: B,
            c: Option.Option<C>
          ): Channel.Channel<R2 | R3, unknown, unknown, unknown, E | E2, Chunk.Chunk<Either.Either<C, B>>, unknown> =>
            pipe(
              Ref.set(sinkLeftovers, Chunk.flatten(leftovers)),
              Effect.zipRight(
                Effect.map(Ref.get(sinkEndReason), (reason) => {
                  switch (reason._tag) {
                    case SinkEndReason.OP_SCHEDULE_END: {
                      return pipe(
                        Effect.all([
                          Ref.get(consumed),
                          forkSink,
                          pipe(timeout(Option.some(b)), Effect.forkIn(scope))
                        ]),
                        Effect.map(([wasConsumed, sinkFiber, scheduleFiber]) => {
                          const toWrite = pipe(
                            c,
                            Option.match({
                              onNone: (): Chunk.Chunk<Either.Either<C, B>> => Chunk.of(Either.right(b)),
                              onSome: (c): Chunk.Chunk<Either.Either<C, B>> =>
                                Chunk.make(Either.right(b), Either.left(c))
                            })
                          )
                          if (wasConsumed) {
                            return pipe(
                              core.write(toWrite),
                              core.flatMap(() => scheduledAggregator(sinkFiber, scheduleFiber, scope))
                            )
                          }
                          return scheduledAggregator(sinkFiber, scheduleFiber, scope)
                        }),
                        channel.unwrap
                      )
                    }
                    case SinkEndReason.OP_UPSTREAM_END: {
                      return pipe(
                        Ref.get(consumed),
                        Effect.map((wasConsumed) =>
                          wasConsumed ?
                            core.write(Chunk.of<Either.Either<C, B>>(Either.right(b))) :
                            core.unit
                        ),
                        channel.unwrap
                      )
                    }
                  }
                })
              ),
              channel.unwrap
            )
          return channel.unwrap(
            Effect.raceWith(Fiber.join(sinkFiber), Fiber.join(scheduleFiber), {
              onSelfDone: (sinkExit, _) =>
                pipe(
                  Fiber.interrupt(scheduleFiber),
                  Effect.zipRight(pipe(
                    Effect.suspend(() => sinkExit),
                    Effect.map(([leftovers, b]) => handleSide(leftovers, b, Option.none()))
                  ))
                ),
              onOtherDone: (scheduleExit, _) =>
                Effect.matchCauseEffect(Effect.suspend(() => scheduleExit), {
                  onFailure: (cause) =>
                    Either.match(
                      Cause.failureOrCause(cause),
                      {
                        onLeft: () =>
                          pipe(
                            handoff,
                            Handoff.offer<HandoffSignal.HandoffSignal<E | E2, A>>(
                              HandoffSignal.end(SinkEndReason.ScheduleEnd)
                            ),
                            Effect.forkDaemon,
                            Effect.zipRight(
                              pipe(
                                Fiber.join(sinkFiber),
                                Effect.map(([leftovers, b]) => handleSide(leftovers, b, Option.none()))
                              )
                            )
                          ),
                        onRight: (cause) =>
                          pipe(
                            handoff,
                            Handoff.offer<HandoffSignal.HandoffSignal<E | E2, A>>(
                              HandoffSignal.halt(cause)
                            ),
                            Effect.forkDaemon,
                            Effect.zipRight(
                              pipe(
                                Fiber.join(sinkFiber),
                                Effect.map(([leftovers, b]) => handleSide(leftovers, b, Option.none()))
                              )
                            )
                          )
                      }
                    ),
                  onSuccess: (c) =>
                    pipe(
                      handoff,
                      Handoff.offer<HandoffSignal.HandoffSignal<E | E2, A>>(
                        HandoffSignal.end(SinkEndReason.ScheduleEnd)
                      ),
                      Effect.forkDaemon,
                      Effect.zipRight(
                        pipe(
                          Fiber.join(sinkFiber),
                          Effect.map(([leftovers, b]) => handleSide(leftovers, b, Option.some(c)))
                        )
                      )
                    )
                })
            })
          )
        }
        return unwrapScoped(
          pipe(
            self,
            toChannel,
            core.pipeTo(handoffProducer),
            channelExecutor.run,
            Effect.forkScoped,
            Effect.zipRight(
              pipe(
                handoffConsumer,
                channel.pipeToOrFail(_sink.toChannel(sink)),
                core.collectElements,
                channelExecutor.run,
                Effect.forkScoped,
                Effect.flatMap((sinkFiber) =>
                  pipe(
                    Effect.forkScoped(timeout(Option.none())),
                    Effect.flatMap((scheduleFiber) =>
                      pipe(
                        Effect.scope,
                        Effect.map((scope) =>
                          new StreamImpl(
                            scheduledAggregator(sinkFiber, scheduleFiber, scope)
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      })
    )
  }
)

/** @internal */
export const as = dual<
  <B>(value: B) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, B>,
  <R, E, A, B>(self: Stream.Stream<R, E, A>, value: B) => Stream.Stream<R, E, B>
>(2, <R, E, A, B>(self: Stream.Stream<R, E, A>, value: B): Stream.Stream<R, E, B> => map(self, () => value))

/** @internal */
export const _async = <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => void,
  outputBuffer = 16
): Stream.Stream<R, E, A> =>
  asyncOption((cb) => {
    register(cb)
    return Option.none()
  }, outputBuffer)

/** @internal */
export const asyncEffect = <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<R, E, unknown>,
  outputBuffer = 16
): Stream.Stream<R, E, A> =>
  pipe(
    Effect.acquireRelease(
      Queue.bounded<Take.Take<E, A>>(outputBuffer),
      (queue) => Queue.shutdown(queue)
    ),
    Effect.flatMap((output) =>
      pipe(
        Effect.runtime<R>(),
        Effect.flatMap((runtime) =>
          pipe(
            register(
              emit.make((k) =>
                pipe(
                  _take.fromPull(k),
                  Effect.flatMap((take) => Queue.offer(output, take)),
                  Effect.asUnit,
                  Runtime.runPromiseExit(runtime)
                ).then((exit) => {
                  if (Exit.isFailure(exit)) {
                    if (!Cause.isInterrupted(exit.cause)) {
                      throw Cause.squash(exit.cause)
                    }
                  }
                })
              )
            ),
            Effect.map(() => {
              const loop: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> = pipe(
                Queue.take(output),
                Effect.flatMap(_take.done),
                Effect.match({
                  onFailure: (maybeError) =>
                    pipe(
                      core.fromEffect(Queue.shutdown(output)),
                      channel.zipRight(Option.match(maybeError, { onNone: () => core.unit, onSome: core.fail }))
                    ),
                  onSuccess: (chunk) => pipe(core.write(chunk), core.flatMap(() => loop))
                }),
                channel.unwrap
              )
              return loop
            })
          )
        )
      )
    ),
    channel.unwrapScoped,
    fromChannel
  )

/** @internal */
export const asyncInterrupt = <R, E, A>(
  register: (
    emit: Emit.Emit<R, E, A, void>
  ) => Either.Either<Effect.Effect<R, never, unknown>, Stream.Stream<R, E, A>>,
  outputBuffer = 16
): Stream.Stream<R, E, A> =>
  pipe(
    Effect.acquireRelease(
      Queue.bounded<Take.Take<E, A>>(outputBuffer),
      (queue) => Queue.shutdown(queue)
    ),
    Effect.flatMap((output) =>
      pipe(
        Effect.runtime<R>(),
        Effect.flatMap((runtime) =>
          pipe(
            Effect.sync(() =>
              register(
                emit.make((k) =>
                  pipe(
                    _take.fromPull(k),
                    Effect.flatMap((take) => Queue.offer(output, take)),
                    Effect.asUnit,
                    Runtime.runPromiseExit(runtime)
                  ).then((exit) => {
                    if (Exit.isFailure(exit)) {
                      if (!Cause.isInterrupted(exit.cause)) {
                        throw Cause.squash(exit.cause)
                      }
                    }
                  })
                )
              )
            ),
            Effect.map(Either.match({
              onLeft: (canceler) => {
                const loop: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> = pipe(
                  Queue.take(output),
                  Effect.flatMap(_take.done),
                  Effect.match({
                    onFailure: (maybeError) =>
                      channel.zipRight(
                        core.fromEffect(Queue.shutdown(output)),
                        Option.match(maybeError, {
                          onNone: () => core.unit,
                          onSome: core.fail
                        })
                      ),
                    onSuccess: (chunk) => pipe(core.write(chunk), core.flatMap(() => loop))
                  }),
                  channel.unwrap
                )
                return pipe(fromChannel(loop), ensuring(canceler))
              },
              onRight: (stream) => unwrap(pipe(Queue.shutdown(output), Effect.as(stream)))
            }))
          )
        )
      )
    ),
    unwrapScoped
  )

/** @internal */
export const asyncOption = <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Option.Option<Stream.Stream<R, E, A>>,
  outputBuffer = 16
): Stream.Stream<R, E, A> =>
  asyncInterrupt(
    (emit) =>
      Option.match(register(emit), {
        onNone: () => Either.left(Effect.unit),
        onSome: Either.right
      }),
    outputBuffer
  )

/** @internal */
export const asyncScoped = <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<R | Scope.Scope, E, unknown>,
  outputBuffer = 16
): Stream.Stream<Exclude<R, Scope.Scope>, E, A> =>
  pipe(
    Effect.acquireRelease(
      Queue.bounded<Take.Take<E, A>>(outputBuffer),
      (queue) => Queue.shutdown(queue)
    ),
    Effect.flatMap((output) =>
      pipe(
        Effect.runtime<R>(),
        Effect.flatMap((runtime) =>
          pipe(
            register(
              emit.make((k) =>
                pipe(
                  _take.fromPull(k),
                  Effect.flatMap((take) => Queue.offer(output, take)),
                  Effect.asUnit,
                  Runtime.runPromiseExit(runtime)
                ).then((exit) => {
                  if (Exit.isFailure(exit)) {
                    if (!Cause.isInterrupted(exit.cause)) {
                      throw Cause.squash(exit.cause)
                    }
                  }
                })
              )
            ),
            Effect.zipRight(Ref.make(false)),
            Effect.flatMap((ref) =>
              pipe(
                Ref.get(ref),
                Effect.map((isDone) =>
                  isDone ?
                    pull.end() :
                    pipe(
                      Queue.take(output),
                      Effect.flatMap(_take.done),
                      Effect.onError(() =>
                        pipe(
                          Ref.set(ref, true),
                          Effect.zipRight(Queue.shutdown(output))
                        )
                      )
                    )
                )
              )
            )
          )
        )
      )
    ),
    scoped,
    flatMap(repeatEffectChunkOption)
  )

/** @internal */
export const branchAfter = dual<
  <A, R2, E2, A2>(
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream.Stream<R2, E2, A2>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  3,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream.Stream<R2, E2, A2>
  ) =>
    suspend(() => {
      const buffering = (
        acc: Chunk.Chunk<A>
      ): Channel.Channel<R | R2, never, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown> =>
        core.readWith({
          onInput: (input) => {
            const nextSize = acc.length + input.length
            if (nextSize >= n) {
              const [b1, b2] = pipe(input, Chunk.splitAt(n - acc.length))
              return running(pipe(acc, Chunk.appendAll(b1)), b2)
            }
            return buffering(pipe(acc, Chunk.appendAll(input)))
          },
          onFailure: core.fail,
          onDone: () => running(acc, Chunk.empty())
        })
      const running = (
        prefix: Chunk.Chunk<A>,
        leftover: Chunk.Chunk<A>
      ): Channel.Channel<R | R2, never, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown> =>
        core.pipeTo(
          channel.zipRight(
            core.write(leftover),
            channel.identityChannel()
          ),
          toChannel(f(prefix))
        )
      return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(buffering(Chunk.empty<A>()))))
    })
)

/** @internal */
export const broadcast = dual<
  <N extends number>(
    n: N,
    maximumLag: number
  ) => <R, E, A>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Stream.Stream.DynamicTuple<Stream.Stream<never, E, A>, N>>,
  <R, E, A, N extends number>(
    self: Stream.Stream<R, E, A>,
    n: N,
    maximumLag: number
  ) => Effect.Effect<Scope.Scope | R, never, Stream.Stream.DynamicTuple<Stream.Stream<never, E, A>, N>>
>(3, <R, E, A, N extends number>(
  self: Stream.Stream<R, E, A>,
  n: N,
  maximumLag: number
): Effect.Effect<R | Scope.Scope, never, Stream.Stream.DynamicTuple<Stream.Stream<never, E, A>, N>> =>
  pipe(
    self,
    broadcastedQueues(n, maximumLag),
    Effect.map((tuple) =>
      tuple.map((queue) => flattenTake(fromQueue(queue, { shutdown: true }))) as Stream.Stream.DynamicTuple<
        Stream.Stream<never, E, A>,
        N
      >
    )
  ))

/** @internal */
export const broadcastDynamic = dual<
  (
    maximumLag: number
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, Stream.Stream<never, E, A>>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    maximumLag: number
  ) => Effect.Effect<Scope.Scope | R, never, Stream.Stream<never, E, A>>
>(2, <R, E, A>(
  self: Stream.Stream<R, E, A>,
  maximumLag: number
): Effect.Effect<R | Scope.Scope, never, Stream.Stream<never, E, A>> =>
  pipe(
    self,
    broadcastedQueuesDynamic(maximumLag),
    Effect.map((effect) => flattenTake(flatMap(scoped(effect), fromQueue)))
  ))

/** @internal */
export const broadcastedQueues = dual<
  <N extends number>(
    n: N,
    maximumLag: number
  ) => <R, E, A>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Stream.Stream.DynamicTuple<Queue.Dequeue<Take.Take<E, A>>, N>>,
  <R, E, A, N extends number>(
    self: Stream.Stream<R, E, A>,
    n: N,
    maximumLag: number
  ) => Effect.Effect<Scope.Scope | R, never, Stream.Stream.DynamicTuple<Queue.Dequeue<Take.Take<E, A>>, N>>
>(3, <R, E, A, N extends number>(
  self: Stream.Stream<R, E, A>,
  n: N,
  maximumLag: number
): Effect.Effect<R | Scope.Scope, never, Stream.Stream.DynamicTuple<Queue.Dequeue<Take.Take<E, A>>, N>> =>
  Effect.flatMap(PubSub.bounded<Take.Take<E, A>>(maximumLag), (pubsub) =>
    pipe(
      Effect.all(Array.from({ length: n }, () => PubSub.subscribe(pubsub))) as Effect.Effect<
        R,
        never,
        Stream.Stream.DynamicTuple<Queue.Dequeue<Take.Take<E, A>>, N>
      >,
      Effect.tap(() => Effect.forkScoped(runIntoPubSubScoped(self, pubsub)))
    )))

/** @internal */
export const broadcastedQueuesDynamic = dual<
  (
    maximumLag: number
  ) => <R, E, A>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Effect.Effect<Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    maximumLag: number
  ) => Effect.Effect<Scope.Scope | R, never, Effect.Effect<Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>>
>(2, <R, E, A>(
  self: Stream.Stream<R, E, A>,
  maximumLag: number
): Effect.Effect<R | Scope.Scope, never, Effect.Effect<Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>> =>
  Effect.map(toPubSub(self, maximumLag), PubSub.subscribe))

/** @internal */
export const buffer = dual<
  (
    options: {
      readonly capacity: "unbounded"
    } | {
      readonly capacity: number
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
    }
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly capacity: "unbounded"
    } | {
      readonly capacity: number
      readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
    }
  ) => Stream.Stream<R, E, A>
>(2, <R, E, A>(
  self: Stream.Stream<R, E, A>,
  options: {
    readonly capacity: "unbounded"
  } | {
    readonly capacity: number
    readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
  }
): Stream.Stream<R, E, A> => {
  if (options.capacity === "unbounded") {
    return bufferUnbounded(self)
  } else if (options.strategy === "dropping") {
    return bufferDropping(self, options.capacity)
  } else if (options.strategy === "sliding") {
    return bufferSliding(self, options.capacity)
  }
  const queue = toQueueOfElements(self, options)
  return new StreamImpl(
    channel.unwrapScoped(
      Effect.map(queue, (queue) => {
        const process: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> = pipe(
          core.fromEffect(Queue.take(queue)),
          core.flatMap(Exit.match({
            onFailure: (cause) =>
              pipe(
                Cause.flipCauseOption(cause),
                Option.match({ onNone: () => core.unit, onSome: core.failCause })
              ),
            onSuccess: (value) => core.flatMap(core.write(Chunk.of(value)), () => process)
          }))
        )
        return process
      })
    )
  )
})

/** @internal */
export const bufferChunks = dual<
  (options: {
    readonly capacity: number
    readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
  }) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, options: {
    readonly capacity: number
    readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
  }) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, options: {
  readonly capacity: number
  readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
}): Stream.Stream<R, E, A> => {
  if (options.strategy === "dropping") {
    return bufferChunksDropping(self, options.capacity)
  } else if (options.strategy === "sliding") {
    return bufferChunksSliding(self, options.capacity)
  }
  const queue = toQueue(self, options)
  return new StreamImpl(
    channel.unwrapScoped(
      Effect.map(queue, (queue) => {
        const process: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> = pipe(
          core.fromEffect(Queue.take(queue)),
          core.flatMap(_take.match({
            onEnd: () => core.unit,
            onFailure: core.failCause,
            onSuccess: (value) => pipe(core.write(value), core.flatMap(() => process))
          }))
        )
        return process
      })
    )
  )
})

const bufferChunksDropping = dual<
  (capacity: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, capacity: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, capacity: number): Stream.Stream<R, E, A> => {
  const queue = Effect.acquireRelease(
    Queue.dropping<readonly [Take.Take<E, A>, Deferred.Deferred<never, void>]>(capacity),
    (queue) => Queue.shutdown(queue)
  )
  return new StreamImpl(bufferSignal(queue, toChannel(self)))
})

const bufferChunksSliding = dual<
  (capacity: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, capacity: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, capacity: number): Stream.Stream<R, E, A> => {
  const queue = Effect.acquireRelease(
    Queue.sliding<readonly [Take.Take<E, A>, Deferred.Deferred<never, void>]>(capacity),
    (queue) => Queue.shutdown(queue)
  )
  return new StreamImpl(bufferSignal(queue, toChannel(self)))
})

const bufferDropping = dual<
  (capacity: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, capacity: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, capacity: number): Stream.Stream<R, E, A> => {
  const queue = Effect.acquireRelease(
    Queue.dropping<readonly [Take.Take<E, A>, Deferred.Deferred<never, void>]>(capacity),
    (queue) => Queue.shutdown(queue)
  )
  return new StreamImpl(bufferSignal(queue, toChannel(rechunk(1)(self))))
})

const bufferSliding = dual<
  (capacity: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, capacity: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, capacity: number): Stream.Stream<R, E, A> => {
  const queue = Effect.acquireRelease(
    Queue.sliding<readonly [Take.Take<E, A>, Deferred.Deferred<never, void>]>(capacity),
    (queue) => Queue.shutdown(queue)
  )
  return new StreamImpl(bufferSignal(queue, toChannel(pipe(self, rechunk(1)))))
})

const bufferUnbounded = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, E, A> => {
  const queue = toQueue(self, { strategy: "unbounded" })
  return new StreamImpl(
    channel.unwrapScoped(
      Effect.map(queue, (queue) => {
        const process: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> = pipe(
          core.fromEffect(Queue.take(queue)),
          core.flatMap(_take.match({
            onEnd: () => core.unit,
            onFailure: core.failCause,
            onSuccess: (value) => core.flatMap(core.write(value), () => process)
          }))
        )
        return process
      })
    )
  )
}

/** @internal */
const bufferSignal = <R, E, A>(
  scoped: Effect.Effect<Scope.Scope, never, Queue.Queue<readonly [Take.Take<E, A>, Deferred.Deferred<never, void>]>>,
  bufferChannel: Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, void>
): Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> => {
  const producer = (
    queue: Queue.Queue<readonly [Take.Take<E, A>, Deferred.Deferred<never, void>]>,
    ref: Ref.Ref<Deferred.Deferred<never, void>>
  ): Channel.Channel<R, E, Chunk.Chunk<A>, unknown, never, never, unknown> => {
    const terminate = (take: Take.Take<E, A>): Channel.Channel<R, E, Chunk.Chunk<A>, unknown, never, never, unknown> =>
      pipe(
        Ref.get(ref),
        Effect.tap(Deferred.await),
        Effect.zipRight(Deferred.make<never, void>()),
        Effect.flatMap((deferred) =>
          pipe(
            Queue.offer(queue, [take, deferred] as const),
            Effect.zipRight(Ref.set(ref, deferred)),
            Effect.zipRight(Deferred.await(deferred))
          )
        ),
        Effect.asUnit,
        core.fromEffect
      )
    return core.readWithCause({
      onInput: (input: Chunk.Chunk<A>) =>
        pipe(
          Deferred.make<never, void>(),
          Effect.flatMap(
            (deferred) =>
              pipe(
                Queue.offer(queue, [_take.chunk(input), deferred] as const),
                Effect.flatMap((added) => pipe(Ref.set(ref, deferred), Effect.when(() => added)))
              )
          ),
          Effect.asUnit,
          core.fromEffect,
          core.flatMap(() => producer(queue, ref))
        ),
      onFailure: (error) => terminate(_take.failCause(error)),
      onDone: () => terminate(_take.end)
    })
  }
  const consumer = (
    queue: Queue.Queue<readonly [Take.Take<E, A>, Deferred.Deferred<never, void>]>
  ): Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> => {
    const process: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> = pipe(
      core.fromEffect(Queue.take(queue)),
      core.flatMap(([take, deferred]) =>
        channel.zipRight(
          core.fromEffect(Deferred.succeed<never, void>(deferred, void 0)),
          _take.match(take, {
            onEnd: () => core.unit,
            onFailure: core.failCause,
            onSuccess: (value) => pipe(core.write(value), core.flatMap(() => process))
          })
        )
      )
    )
    return process
  }
  return channel.unwrapScoped(
    pipe(
      scoped,
      Effect.flatMap((queue) =>
        pipe(
          Deferred.make<never, void>(),
          Effect.tap((start) => Deferred.succeed<never, void>(start, void 0)),
          Effect.flatMap((start) =>
            pipe(
              Ref.make(start),
              Effect.flatMap((ref) =>
                pipe(
                  bufferChannel,
                  core.pipeTo(producer(queue, ref)),
                  channelExecutor.runScoped,
                  Effect.forkScoped
                )
              ),
              Effect.as(consumer(queue))
            )
          )
        )
      )
    )
  )
}

/** @internal */
export const catchAll = dual<
  <E, R2, E2, A2>(
    f: (error: E) => Stream.Stream<R2, E2, A2>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (error: E) => Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2, A2 | A>
>(2, <R, A, E, R2, E2, A2>(
  self: Stream.Stream<R, E, A>,
  f: (error: E) => Stream.Stream<R2, E2, A2>
): Stream.Stream<R | R2, E2, A | A2> =>
  catchAllCause(self, (cause) =>
    Either.match(Cause.failureOrCause(cause), {
      onLeft: f,
      onRight: failCause
    })))

/** @internal */
export const catchAllCause = dual<
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Stream.Stream<R2, E2, A2>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (cause: Cause.Cause<E>) => Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2, A2 | A>
>(
  2,
  <R, A, E, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (cause: Cause.Cause<E>) => Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E2, A | A2> =>
    new StreamImpl<R | R2, E2, A | A2>(pipe(toChannel(self), core.catchAllCause((cause) => toChannel(f(cause)))))
)

/** @internal */
export const catchSome = dual<
  <E, R2, E2, A2>(
    pf: (error: E) => Option.Option<Stream.Stream<R2, E2, A2>>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E | E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    pf: (error: E) => Option.Option<Stream.Stream<R2, E2, A2>>
  ) => Stream.Stream<R2 | R, E | E2, A2 | A>
>(
  2,
  <R, A, E, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    pf: (error: E) => Option.Option<Stream.Stream<R2, E2, A2>>
  ): Stream.Stream<R | R2, E | E2, A | A2> =>
    pipe(self, catchAll((error) => pipe(pf(error), Option.getOrElse(() => fail<E | E2>(error)))))
)

/** @internal */
export const catchSomeCause = dual<
  <E, R2, E2, A2>(
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream.Stream<R2, E2, A2>>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E | E2, A2 | A>,
  <R, A, E, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream.Stream<R2, E2, A2>>
  ) => Stream.Stream<R2 | R, E | E2, A2 | A>
>(
  2,
  <R, A, E, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream.Stream<R2, E2, A2>>
  ): Stream.Stream<R | R2, E | E2, A | A2> =>
    pipe(self, catchAllCause((cause) => pipe(pf(cause), Option.getOrElse(() => failCause<E | E2>(cause)))))
)

/* @internal */
export const catchTag = dual<
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Stream.Stream<R1, E1, A1>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R | R1, Exclude<E, { _tag: K }> | E1, A | A1>,
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, R1, E1, A1>(
    self: Stream.Stream<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Stream.Stream<R1, E1, A1>
  ) => Stream.Stream<R | R1, Exclude<E, { _tag: K }> | E1, A | A1>
>(3, (self, k, f) =>
  catchAll(self, (e) => {
    if ("_tag" in e && e["_tag"] === k) {
      return f(e as any)
    }
    return fail(e as any)
  }))

/** @internal */
export const catchTags: {
  <
    E extends { _tag: string },
    Cases extends {
      [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Stream.Stream<any, any, any>
    }
  >(
    cases: Cases
  ): <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends
        ((...args: Array<any>) => Stream.Stream.Variance<infer R, infer _E, infer _A>) ? R
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends
        ((...args: Array<any>) => Stream.Stream.Variance<infer _R, infer E, infer _A>) ? E
        : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends
        ((...args: Array<any>) => Stream.Stream.Variance<infer _R, infer _E, infer A>) ? A
        : never
    }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends {
      [K in E["_tag"]]+?: (error: Extract<E, { _tag: K }>) => Stream.Stream<any, any, any>
    }
  >(
    self: Stream.Stream<R, E, A>,
    cases: Cases
  ): Stream.Stream<
    | R
    | {
      [K in keyof Cases]: Cases[K] extends
        ((...args: Array<any>) => Stream.Stream.Variance<infer R, infer _E, infer _A>) ? R
        : never
    }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
      [K in keyof Cases]: Cases[K] extends
        ((...args: Array<any>) => Stream.Stream.Variance<infer _R, infer E, infer _A>) ? E
        : never
    }[keyof Cases],
    | A
    | {
      [K in keyof Cases]: Cases[K] extends
        ((...args: Array<any>) => Stream.Stream.Variance<infer _R, infer _E, infer A>) ? A
        : never
    }[keyof Cases]
  >
} = dual(2, (self, cases) =>
  catchAll(self, (e: any) => {
    const keys = Object.keys(cases)
    if ("_tag" in e && keys.includes(e["_tag"])) {
      return cases[e["_tag"]](e as any)
    }
    return fail(e as any)
  }))

/** @internal */
export const changes = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, E, A> =>
  pipe(self, changesWith((x, y) => Equal.equals(y)(x)))

/** @internal */
export const changesWith = dual<
  <A>(f: (x: A, y: A) => boolean) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, f: (x: A, y: A) => boolean) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, f: (x: A, y: A) => boolean): Stream.Stream<R, E, A> => {
  const writer = (
    last: Option.Option<A>
  ): Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, void> =>
    core.readWithCause({
      onInput: (input: Chunk.Chunk<A>) => {
        const [newLast, newChunk] = Chunk.reduce(
          input,
          [last, Chunk.empty<A>()] as const,
          ([option, outputs], output) => {
            if (Option.isSome(option) && f(option.value, output)) {
              return [Option.some(output), outputs] as const
            }
            return [Option.some(output), pipe(outputs, Chunk.append(output))] as const
          }
        )
        return core.flatMap(
          core.write(newChunk),
          () => writer(newLast)
        )
      },
      onFailure: core.failCause,
      onDone: () => core.unit
    })
  return new StreamImpl(pipe(toChannel(self), core.pipeTo(writer(Option.none()))))
})

/** @internal */
export const changesWithEffect = dual<
  <A, R2, E2>(
    f: (x: A, y: A) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    f: (x: A, y: A) => Effect.Effect<R2, E2, boolean>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    f: (x: A, y: A) => Effect.Effect<R2, E2, boolean>
  ): Stream.Stream<R | R2, E | E2, A> => {
    const writer = (
      last: Option.Option<A>
    ): Channel.Channel<R | R2, E | E2, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, void> =>
      core.readWithCause({
        onInput: (input: Chunk.Chunk<A>) =>
          pipe(
            input,
            Effect.reduce([last, Chunk.empty<A>()] as const, ([option, outputs], output) => {
              if (Option.isSome(option)) {
                return pipe(
                  f(option.value, output),
                  Effect.map((bool) =>
                    bool ?
                      [Option.some(output), outputs] as const :
                      [Option.some(output), pipe(outputs, Chunk.append(output))] as const
                  )
                )
              }
              return Effect.succeed(
                [
                  Option.some(output),
                  pipe(outputs, Chunk.append(output))
                ] as const
              )
            }),
            core.fromEffect,
            core.flatMap(([newLast, newChunk]) =>
              pipe(
                core.write(newChunk),
                core.flatMap(() => writer(newLast))
              )
            )
          ),
        onFailure: core.failCause,
        onDone: () => core.unit
      })
    return new StreamImpl(pipe(toChannel(self), core.pipeTo(writer(Option.none()))))
  }
)

/** @internal */
export const chunks = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, E, Chunk.Chunk<A>> =>
  pipe(self, mapChunks(Chunk.of))

/** @internal */
export const chunksWith = dual<
  <R, E, A, R2, E2, A2>(
    f: (stream: Stream.Stream<R, E, Chunk.Chunk<A>>) => Stream.Stream<R2, E2, Chunk.Chunk<A2>>
  ) => (self: Stream.Stream<R, E, A>) => Stream.Stream<R | R2, E | E2, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (stream: Stream.Stream<R, E, Chunk.Chunk<A>>) => Stream.Stream<R2, E2, Chunk.Chunk<A2>>
  ) => Stream.Stream<R | R2, E | E2, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (stream: Stream.Stream<R, E, Chunk.Chunk<A>>) => Stream.Stream<R2, E2, Chunk.Chunk<A2>>
  ): Stream.Stream<R | R2, E | E2, A2> => flattenChunks(f(chunks(self)))
)

const unsome = <R, E, A>(effect: Effect.Effect<R, Option.Option<E>, A>): Effect.Effect<R, E, Option.Option<A>> =>
  Effect.catchAll(
    Effect.asSome(effect),
    (o) => o._tag === "None" ? Effect.succeedNone : Effect.fail(o.value)
  )

/** @internal */
export const combine = dual<
  <R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    that: Stream.Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, A>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, A2>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [A3, S]>>
  ) => <R>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R3 | R4 | R5 | R, E2 | E, A3>,
  <R, R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, A>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, A2>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [A3, S]>>
  ) => Stream.Stream<R2 | R3 | R4 | R5 | R, E2 | E, A3>
>(4, <R, R2, E2, A2, S, R3, E, A, R4, R5, A3>(
  self: Stream.Stream<R, E, A>,
  that: Stream.Stream<R2, E2, A2>,
  s: S,
  f: (
    s: S,
    pullLeft: Effect.Effect<R3, Option.Option<E>, A>,
    pullRight: Effect.Effect<R4, Option.Option<E2>, A2>
  ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E | E2>, readonly [A3, S]>>
): Stream.Stream<R | R2 | R3 | R4 | R5, E | E2, A3> => {
  const producer = <Err, Elem>(
    handoff: Handoff.Handoff<Exit.Exit<Option.Option<Err>, Elem>>,
    latch: Handoff.Handoff<void>
  ): Channel.Channel<R, Err, Elem, unknown, never, never, unknown> =>
    pipe(
      core.fromEffect(Handoff.take(latch)),
      channel.zipRight(core.readWithCause({
        onInput: (input) =>
          core.flatMap(
            core.fromEffect(pipe(
              handoff,
              Handoff.offer<Exit.Exit<Option.Option<Err>, Elem>>(Exit.succeed(input))
            )),
            () => producer(handoff, latch)
          ),
        onFailure: (cause) =>
          core.fromEffect(
            Handoff.offer<Exit.Exit<Option.Option<Err>, Elem>>(
              handoff,
              Exit.failCause(pipe(cause, Cause.map(Option.some)))
            )
          ),
        onDone: () =>
          core.flatMap(
            core.fromEffect(
              Handoff.offer<Exit.Exit<Option.Option<Err>, Elem>>(
                handoff,
                Exit.fail(Option.none())
              )
            ),
            () => producer(handoff, latch)
          )
      }))
    )
  return new StreamImpl(
    channel.unwrapScoped(
      Effect.gen(function*($) {
        const left = yield* $(Handoff.make<Exit.Exit<Option.Option<E>, A>>())
        const right = yield* $(Handoff.make<Exit.Exit<Option.Option<E2>, A2>>())
        const latchL = yield* $(Handoff.make<void>())
        const latchR = yield* $(Handoff.make<void>())
        yield* $(
          toChannel(self),
          channel.concatMap(channel.writeChunk),
          core.pipeTo(producer(left, latchL)),
          channelExecutor.runScoped,
          Effect.forkScoped
        )
        yield* $(
          toChannel(that),
          channel.concatMap(channel.writeChunk),
          core.pipeTo(producer(right, latchR)),
          channelExecutor.runScoped,
          Effect.forkScoped
        )
        const pullLeft = pipe(
          latchL,
          Handoff.offer<void>(void 0),
          // TODO: remove
          Effect.zipRight(pipe(Handoff.take(left), Effect.flatMap((exit) => Effect.suspend(() => exit))))
        )
        const pullRight = pipe(
          latchR,
          Handoff.offer<void>(void 0),
          // TODO: remove
          Effect.zipRight(pipe(Handoff.take(right), Effect.flatMap((exit) => Effect.suspend(() => exit))))
        )
        return toChannel(unfoldEffect(s, (s) => Effect.flatMap(f(s, pullLeft, pullRight), unsome)))
      })
    )
  )
})

/** @internal */
export const combineChunks = dual<
  <R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    that: Stream.Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, Chunk.Chunk<A>>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, Chunk.Chunk<A2>>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [Chunk.Chunk<A3>, S]>>
  ) => <R>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R3 | R4 | R5 | R, E2 | E, A3>,
  <R, R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, Chunk.Chunk<A>>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, Chunk.Chunk<A2>>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [Chunk.Chunk<A3>, S]>>
  ) => Stream.Stream<R2 | R3 | R4 | R5 | R, E2 | E, A3>
>(4, <R, R2, E2, A2, S, R3, E, A, R4, R5, A3>(
  self: Stream.Stream<R, E, A>,
  that: Stream.Stream<R2, E2, A2>,
  s: S,
  f: (
    s: S,
    pullLeft: Effect.Effect<R3, Option.Option<E>, Chunk.Chunk<A>>,
    pullRight: Effect.Effect<R4, Option.Option<E2>, Chunk.Chunk<A2>>
  ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, S]>>
): Stream.Stream<R | R2 | R3 | R4 | R5, E | E2, A3> => {
  const producer = <Err, Elem>(
    handoff: Handoff.Handoff<Take.Take<Err, Elem>>,
    latch: Handoff.Handoff<void>
  ): Channel.Channel<R, Err, Chunk.Chunk<Elem>, unknown, never, never, unknown> =>
    channel.zipRight(
      core.fromEffect(Handoff.take(latch)),
      core.readWithCause({
        onInput: (input) =>
          core.flatMap(
            core.fromEffect(pipe(
              handoff,
              Handoff.offer<Take.Take<Err, Elem>>(_take.chunk(input))
            )),
            () => producer(handoff, latch)
          ),
        onFailure: (cause) =>
          core.fromEffect(
            Handoff.offer<Take.Take<Err, Elem>>(
              handoff,
              _take.failCause(cause)
            )
          ),
        onDone: (): Channel.Channel<R, Err, Chunk.Chunk<Elem>, unknown, never, never, unknown> =>
          core.fromEffect(Handoff.offer<Take.Take<Err, Elem>>(handoff, _take.end))
      })
    )
  return new StreamImpl(
    pipe(
      Effect.all([
        Handoff.make<Take.Take<E, A>>(),
        Handoff.make<Take.Take<E2, A2>>(),
        Handoff.make<void>(),
        Handoff.make<void>()
      ]),
      Effect.tap(([left, _, latchL]) =>
        pipe(
          toChannel(self),
          core.pipeTo(producer(left, latchL)),
          channelExecutor.runScoped,
          Effect.forkScoped
        )
      ),
      Effect.tap(([_, right, __, latchR]) =>
        pipe(
          toChannel(that),
          core.pipeTo(producer(right, latchR)),
          channelExecutor.runScoped,
          Effect.forkScoped
        )
      ),
      Effect.map(([left, right, latchL, latchR]) => {
        const pullLeft = pipe(
          latchL,
          Handoff.offer<void>(void 0),
          Effect.zipRight(
            pipe(
              Handoff.take(left),
              Effect.flatMap(_take.done)
            )
          )
        )
        const pullRight = pipe(
          latchR,
          Handoff.offer<void>(void 0),
          Effect.zipRight(
            pipe(
              Handoff.take(right),
              Effect.flatMap(_take.done)
            )
          )
        )
        return toChannel(unfoldChunkEffect(s, (s) => Effect.flatMap(f(s, pullLeft, pullRight), unsome)))
      }),
      channel.unwrapScoped
    )
  )
})

/** @internal */
export const concat = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2 | A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A | A2> =>
    new StreamImpl<R | R2, E | E2, A | A2>(pipe(toChannel(self), channel.zipRight(toChannel(that))))
)

/** @internal */
export const concatAll = <R, E, A>(streams: Chunk.Chunk<Stream.Stream<R, E, A>>): Stream.Stream<R, E, A> =>
  suspend(() => pipe(streams, Chunk.reduce(empty as Stream.Stream<R, E, A>, (x, y) => concat(y)(x))))

/** @internal */
export const cross = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, [A, A2]>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, [A, A2]>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, [A, A2]> => pipe(self, crossWith(that, (a, a2) => [a, a2]))
)

/** @internal */
export const crossLeft = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A> => pipe(self, crossWith(that, (a, _) => a))
)

/** @internal */
export const crossRight = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A2> => flatMap(self, () => that)
)

/** @internal */
export const crossWith = dual<
  <R2, E2, B, A, C>(
    that: Stream.Stream<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, C>,
  <R, E, R2, E2, B, A, C>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, B>,
    f: (a: A, b: B) => C
  ) => Stream.Stream<R2 | R, E2 | E, C>
>(
  3,
  <R, E, R2, E2, B, A, C>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, B>,
    f: (a: A, b: B) => C
  ): Stream.Stream<R | R2, E | E2, C> => pipe(self, flatMap((a) => pipe(that, map((b) => f(a, b)))))
)

/** @internal */
export const debounce = dual<
  (duration: Duration.DurationInput) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, duration: Duration.DurationInput) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, duration: Duration.DurationInput): Stream.Stream<R, E, A> =>
  pipe(
    singleProducerAsyncInput.make<never, Chunk.Chunk<A>, unknown>(),
    Effect.flatMap((input) =>
      Effect.transplant<never, never, Stream.Stream<R, E, A>>((grafter) =>
        pipe(
          Handoff.make<HandoffSignal.HandoffSignal<E, A>>(),
          Effect.map((handoff) => {
            const enqueue = (last: Chunk.Chunk<A>): Effect.Effect<
              never,
              never,
              Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown>
            > =>
              pipe(
                Clock.sleep(duration),
                Effect.as(last),
                Effect.fork,
                grafter,
                Effect.map((fiber) => consumer(DebounceState.previous(fiber)))
              )
            const producer: Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, never, unknown> = core
              .readWithCause({
                onInput: (input: Chunk.Chunk<A>) =>
                  Option.match(Chunk.last(input), {
                    onNone: () => producer,
                    onSome: (last) =>
                      core.flatMap(
                        core.fromEffect(
                          Handoff.offer<HandoffSignal.HandoffSignal<E, A>>(
                            handoff,
                            HandoffSignal.emit(Chunk.of(last))
                          )
                        ),
                        () => producer
                      )
                  }),
                onFailure: (cause) =>
                  core.fromEffect(
                    Handoff.offer<HandoffSignal.HandoffSignal<E, A>>(handoff, HandoffSignal.halt(cause))
                  ),
                onDone: () =>
                  core.fromEffect(
                    Handoff.offer<HandoffSignal.HandoffSignal<E, A>>(
                      handoff,
                      HandoffSignal.end(SinkEndReason.UpstreamEnd)
                    )
                  )
              })
            const consumer = (
              state: DebounceState.DebounceState<E, A>
            ): Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown> => {
              switch (state._tag) {
                case DebounceState.OP_NOT_STARTED: {
                  return pipe(
                    Handoff.take(handoff),
                    Effect.map((signal) => {
                      switch (signal._tag) {
                        case HandoffSignal.OP_EMIT: {
                          return channel.unwrap(enqueue(signal.elements))
                        }
                        case HandoffSignal.OP_HALT: {
                          return core.failCause(signal.cause)
                        }
                        case HandoffSignal.OP_END: {
                          return core.unit
                        }
                      }
                    }),
                    channel.unwrap
                  )
                }
                case DebounceState.OP_PREVIOUS: {
                  return channel.unwrap(
                    Effect.raceWith(Fiber.join(state.fiber), Handoff.take(handoff), {
                      onSelfDone: (leftExit, current) =>
                        Exit.match(leftExit, {
                          onFailure: (cause) => pipe(Fiber.interrupt(current), Effect.as(core.failCause(cause))),
                          onSuccess: (chunk) =>
                            Effect.succeed(
                              pipe(core.write(chunk), core.flatMap(() => consumer(DebounceState.current(current))))
                            )
                        }),
                      onOtherDone: (rightExit, previous) =>
                        Exit.match(rightExit, {
                          onFailure: (cause) => pipe(Fiber.interrupt(previous), Effect.as(core.failCause(cause))),
                          onSuccess: (signal) => {
                            switch (signal._tag) {
                              case HandoffSignal.OP_EMIT: {
                                return pipe(Fiber.interrupt(previous), Effect.zipRight(enqueue(signal.elements)))
                              }
                              case HandoffSignal.OP_HALT: {
                                return pipe(Fiber.interrupt(previous), Effect.as(core.failCause(signal.cause)))
                              }
                              case HandoffSignal.OP_END: {
                                return pipe(
                                  Fiber.join(previous),
                                  Effect.map((chunk) => pipe(core.write(chunk), channel.zipRight(core.unit)))
                                )
                              }
                            }
                          }
                        })
                    })
                  )
                }
                case DebounceState.OP_CURRENT: {
                  return pipe(
                    Fiber.join(state.fiber),
                    Effect.map((signal) => {
                      switch (signal._tag) {
                        case HandoffSignal.OP_EMIT: {
                          return channel.unwrap(enqueue(signal.elements))
                        }
                        case HandoffSignal.OP_HALT: {
                          return core.failCause(signal.cause)
                        }
                        case HandoffSignal.OP_END: {
                          return core.unit
                        }
                      }
                    }),
                    channel.unwrap
                  )
                }
              }
            }
            const debounceChannel: Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> =
              pipe(
                channel.fromInput(input),
                core.pipeTo(producer),
                channelExecutor.run,
                Effect.forkScoped,
                Effect.as(pipe(
                  consumer(DebounceState.notStarted),
                  core.embedInput<E, Chunk.Chunk<A>, unknown>(input as any)
                )),
                channel.unwrapScoped
              )
            return new StreamImpl(pipe(toChannel(self), core.pipeTo(debounceChannel)))
          })
        )
      )
    ),
    unwrap
  ))

/** @internal */
export const die = (defect: unknown): Stream.Stream<never, never, never> => fromEffect(Effect.die(defect))

/** @internal */
export const dieSync = (evaluate: LazyArg<unknown>): Stream.Stream<never, never, never> =>
  fromEffect(Effect.dieSync(evaluate))

/** @internal */
export const dieMessage = (message: string): Stream.Stream<never, never, never> =>
  fromEffect(Effect.dieMessage(message))

/** @internal */
export const distributedWith = dual<
  <N extends number, A>(
    options: {
      readonly size: N
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ) => <R, E>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<
    Scope.Scope | R,
    never,
    Stream.Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>, N>
  >,
  <R, E, N extends number, A>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly size: N
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ) => Effect.Effect<
    Scope.Scope | R,
    never,
    Stream.Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>, N>
  >
>(
  2,
  <R, E, N extends number, A>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly size: N
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ): Effect.Effect<
    R | Scope.Scope,
    never,
    Stream.Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>, N>
  > =>
    pipe(
      Deferred.make<never, (a: A) => Effect.Effect<never, never, Predicate<number>>>(),
      Effect.flatMap((deferred) =>
        pipe(
          self,
          distributedWithDynamic({
            maximumLag: options.maximumLag,
            decide: (a) => Effect.flatMap(Deferred.await(deferred), (f) => f(a))
          }),
          Effect.flatMap((next) =>
            pipe(
              Effect.all(
                Chunk.map(
                  Chunk.range(0, options.size - 1),
                  (id) => Effect.map(next, ([key, queue]) => [[key, id], queue] as const)
                )
              ),
              Effect.map(Chunk.unsafeFromArray),
              Effect.flatMap((entries) => {
                const [mappings, queues] = Chunk.reduceRight(
                  entries,
                  [
                    new Map<number, number>(),
                    Chunk.empty<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>>()
                  ] as const,
                  ([mappings, queues], [mapping, queue]) =>
                    [
                      mappings.set(mapping[0], mapping[1]),
                      pipe(queues, Chunk.prepend(queue))
                    ] as const
                )
                return pipe(
                  Deferred.succeed(deferred, (a: A) =>
                    Effect.map(options.decide(a), (f) => (key: number) => pipe(f(mappings.get(key)!)))),
                  Effect.as(
                    Array.from(queues) as Stream.Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>, N>
                  )
                )
              })
            )
          )
        )
      )
    )
)

/** @internal */
const distributedWithDynamicId = { ref: 0 }

const newDistributedWithDynamicId = () => {
  const current = distributedWithDynamicId.ref
  distributedWithDynamicId.ref = current + 1
  return current
}

/** @internal */
export const distributedWithDynamic = dual<
  <E, A, _>(
    options: {
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ) => <R>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<
    Scope.Scope | R,
    never,
    Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
  >,
  <R, E, A, _>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ) => Effect.Effect<
    Scope.Scope | R,
    never,
    Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
  >
>(2, <R, E, A, _>(
  self: Stream.Stream<R, E, A>,
  options: {
    readonly maximumLag: number
    readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
  }
): Effect.Effect<
  R | Scope.Scope,
  never,
  Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
> => distributedWithDynamicCallback(self, options.maximumLag, options.decide, () => Effect.unit))

/** @internal */
export const distributedWithDynamicCallback = dual<
  <E, A, _>(
    maximumLag: number,
    decide: (a: A) => Effect.Effect<never, never, Predicate<number>>,
    done: (exit: Exit.Exit<Option.Option<E>, never>) => Effect.Effect<never, never, _>
  ) => <R>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<
    Scope.Scope | R,
    never,
    Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
  >,
  <R, E, A, _>(
    self: Stream.Stream<R, E, A>,
    maximumLag: number,
    decide: (a: A) => Effect.Effect<never, never, Predicate<number>>,
    done: (exit: Exit.Exit<Option.Option<E>, never>) => Effect.Effect<never, never, _>
  ) => Effect.Effect<
    Scope.Scope | R,
    never,
    Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
  >
>(4, <R, E, A, _>(
  self: Stream.Stream<R, E, A>,
  maximumLag: number,
  decide: (a: A) => Effect.Effect<never, never, Predicate<number>>,
  done: (exit: Exit.Exit<Option.Option<E>, never>) => Effect.Effect<never, never, _>
): Effect.Effect<
  R | Scope.Scope,
  never,
  Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
> =>
  pipe(
    Effect.acquireRelease(
      Ref.make<Map<number, Queue.Queue<Exit.Exit<Option.Option<E>, A>>>>(new Map()),
      (ref, _) => pipe(Ref.get(ref), Effect.flatMap((queues) => pipe(queues.values(), Effect.forEach(Queue.shutdown))))
    ),
    Effect.flatMap((queuesRef) =>
      Effect.gen(function*($) {
        const offer = (a: A): Effect.Effect<never, never, void> =>
          pipe(
            decide(a),
            Effect.flatMap((shouldProcess) =>
              pipe(
                Ref.get(queuesRef),
                Effect.flatMap((queues) =>
                  pipe(
                    queues.entries(),
                    Effect.reduce(Chunk.empty<number>(), (acc, [id, queue]) => {
                      if (shouldProcess(id)) {
                        return pipe(
                          Queue.offer(queue, Exit.succeed(a)),
                          Effect.matchCauseEffect({
                            onFailure: (cause) =>
                              // Ignore all downstream queues that were shut
                              // down and remove them later
                              Cause.isInterrupted(cause) ?
                                Effect.succeed(pipe(acc, Chunk.prepend(id))) :
                                Effect.failCause(cause),
                            onSuccess: () => Effect.succeed(acc)
                          })
                        )
                      }
                      return Effect.succeed(acc)
                    }),
                    Effect.flatMap((ids) => {
                      if (Chunk.isNonEmpty(ids)) {
                        return pipe(
                          Ref.update(queuesRef, (map) => {
                            for (const id of ids) {
                              map.delete(id)
                            }
                            return map
                          })
                        )
                      }
                      return Effect.unit
                    })
                  )
                )
              )
            ),
            Effect.asUnit
          )
        const queuesLock = yield* $(Effect.makeSemaphore(1))
        const newQueue = yield* $(
          Ref.make<Effect.Effect<never, never, [number, Queue.Queue<Exit.Exit<Option.Option<E>, A>>]>>(
            pipe(
              Queue.bounded<Exit.Exit<Option.Option<E>, A>>(maximumLag),
              Effect.flatMap((queue) => {
                const id = newDistributedWithDynamicId()
                return pipe(
                  Ref.update(queuesRef, (map) => map.set(id, queue)),
                  Effect.as([id, queue])
                )
              })
            )
          )
        )
        const finalize = (endTake: Exit.Exit<Option.Option<E>, never>): Effect.Effect<never, never, void> =>
          // Make sure that no queues are currently being added
          queuesLock.withPermits(1)(
            pipe(
              Ref.set(
                newQueue,
                pipe(
                  // All newly created queues should end immediately
                  Queue.bounded<Exit.Exit<Option.Option<E>, A>>(1),
                  Effect.tap((queue) => Queue.offer(queue, endTake)),
                  Effect.flatMap((queue) => {
                    const id = newDistributedWithDynamicId()
                    return pipe(
                      Ref.update(queuesRef, (map) => map.set(id, queue)),
                      Effect.as(Tuple.make(id, queue))
                    )
                  })
                )
              ),
              Effect.zipRight(
                pipe(
                  Ref.get(queuesRef),
                  Effect.flatMap((map) =>
                    pipe(
                      Chunk.fromIterable(map.values()),
                      Effect.forEach((queue) =>
                        pipe(
                          Queue.offer(queue, endTake),
                          Effect.catchSomeCause((cause) =>
                            Cause.isInterrupted(cause) ? Option.some(Effect.unit) : Option.none()
                          )
                        )
                      )
                    )
                  )
                )
              ),
              Effect.zipRight(done(endTake)),
              Effect.asUnit
            )
          )
        yield* $(
          self,
          runForEachScoped(offer),
          Effect.matchCauseEffect({
            onFailure: (cause) => finalize(Exit.failCause(pipe(cause, Cause.map(Option.some)))),
            onSuccess: () => finalize(Exit.fail(Option.none()))
          }),
          Effect.forkScoped
        )
        return queuesLock.withPermits(1)(
          Effect.flatten(Ref.get(newQueue))
        )
      })
    )
  ))

/** @internal */
export const drain = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, E, never> =>
  new StreamImpl(channel.drain(toChannel(self)))

/** @internal */
export const drainFork = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A> =>
    pipe(
      fromEffect(Deferred.make<E2, never>()),
      flatMap((backgroundDied) =>
        pipe(
          scoped(
            pipe(
              that,
              runForEachScoped(() => Effect.unit),
              Effect.catchAllCause((cause) => Deferred.failCause(backgroundDied, cause)),
              Effect.forkScoped
            )
          ),
          crossRight(pipe(self, interruptWhenDeferred(backgroundDied)))
        )
      )
    )
)

/** @internal */
export const drop = dual<
  (n: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, n: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, n: number): Stream.Stream<R, E, A> => {
  const loop = (r: number): Channel.Channel<never, never, Chunk.Chunk<A>, unknown, never, Chunk.Chunk<A>, unknown> =>
    core.readWith({
      onInput: (input: Chunk.Chunk<A>) => {
        const dropped = pipe(input, Chunk.drop(r))
        const leftover = Math.max(0, r - input.length)
        const more = Chunk.isEmpty(input) || leftover > 0
        if (more) {
          return loop(leftover)
        }
        return pipe(
          core.write(dropped),
          channel.zipRight(channel.identityChannel<never, Chunk.Chunk<A>, unknown>())
        )
      },
      onFailure: core.fail,
      onDone: () => core.unit
    })
  return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(loop(n))))
})

/** @internal */
export const dropRight = dual<
  (n: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, n: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, n: number): Stream.Stream<R, E, A> => {
  if (n <= 0) {
    return identityStream()
  }
  return suspend(() => {
    const queue = new RingBuffer<A>(n)
    const reader: Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, void> = core.readWith({
      onInput: (input: Chunk.Chunk<A>) => {
        const outputs = pipe(
          input,
          Chunk.filterMap((elem) => {
            const head = queue.head()
            queue.put(elem)
            return head
          })
        )
        return pipe(core.write(outputs), core.flatMap(() => reader))
      },
      onFailure: core.fail,
      onDone: () => core.unit
    })
    return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(reader)))
  })
})

/** @internal */
export const dropUntil = dual<
  <A, X extends A>(predicate: Predicate<X>) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A, X extends A>(self: Stream.Stream<R, E, A>, predicate: Predicate<X>) => Stream.Stream<R, E, A>
>(
  2,
  <R, E, A, X extends A>(self: Stream.Stream<R, E, A>, predicate: Predicate<X>): Stream.Stream<R, E, A> =>
    drop(dropWhile(self, (a) => !predicate(a as X)), 1)
)

/** @internal */
export const dropUntilEffect = dual<
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, X extends A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, X extends A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream.Stream<R | R2, E | E2, A> => {
    const loop: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, unknown> = core.readWith({
      onInput: (input: Chunk.Chunk<A>) =>
        pipe(
          Effect.dropUntil(input, predicate as (a: A) => Effect.Effect<R2, E2, boolean>),
          Effect.map(Chunk.unsafeFromArray),
          Effect.map((leftover) => {
            const more = Chunk.isEmpty(leftover)
            if (more) {
              return core.suspend(() => loop)
            }
            return pipe(
              core.write(leftover),
              channel.zipRight(channel.identityChannel<E | E2, Chunk.Chunk<A>, unknown>())
            )
          }),
          channel.unwrap
        ),
      onFailure: core.fail,
      onDone: () => core.unit
    })
    return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(loop)))
  }
)

/** @internal */
export const dropWhile = dual<
  <A, X extends A>(predicate: Predicate<X>) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A, X extends A>(self: Stream.Stream<R, E, A>, predicate: Predicate<X>) => Stream.Stream<R, E, A>
>(2, <R, E, A, X extends A>(self: Stream.Stream<R, E, A>, predicate: Predicate<X>): Stream.Stream<R, E, A> => {
  const loop: Channel.Channel<never, never, Chunk.Chunk<A>, unknown, never, Chunk.Chunk<A>, unknown> = core.readWith({
    onInput: (input: Chunk.Chunk<A>) => {
      const output = Chunk.dropWhile(input, predicate as Predicate<A>)
      if (Chunk.isEmpty(output)) {
        return core.suspend(() => loop)
      }
      return channel.zipRight(
        core.write(output),
        channel.identityChannel<never, Chunk.Chunk<A>, unknown>()
      )
    },
    onFailure: core.fail,
    onDone: core.succeedNow
  })
  return new StreamImpl(channel.pipeToOrFail(toChannel(self), loop))
})

/** @internal */
export const dropWhileEffect = dual<
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, X extends A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, X extends A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream.Stream<R | R2, E | E2, A> => {
    const loop: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, unknown> = core.readWith({
      onInput: (input: Chunk.Chunk<A>) =>
        pipe(
          Effect.dropWhile(input, predicate as (a: A) => Effect.Effect<R2, E2, boolean>),
          Effect.map(Chunk.unsafeFromArray),
          Effect.map((leftover) => {
            const more = Chunk.isEmpty(leftover)
            if (more) {
              return core.suspend(() => loop)
            }
            return channel.zipRight(
              core.write(leftover),
              channel.identityChannel<E | E2, Chunk.Chunk<A>, unknown>()
            )
          }),
          channel.unwrap
        ),
      onFailure: core.fail,
      onDone: () => core.unit
    })
    return new StreamImpl(channel.pipeToOrFail(
      toChannel(self),
      loop
    ))
  }
)

/** @internal */
export const either = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, never, Either.Either<E, A>> =>
  pipe(self, map(Either.right), catchAll((error) => make(Either.left(error))))

/** @internal */
export const empty: Stream.Stream<never, never, never> = new StreamImpl(core.write(Chunk.empty()))

/** @internal */
export const ensuring = dual<
  <R2, _>(
    finalizer: Effect.Effect<R2, never, _>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, A>,
  <R, E, A, R2, _>(self: Stream.Stream<R, E, A>, finalizer: Effect.Effect<R2, never, _>) => Stream.Stream<R2 | R, E, A>
>(
  2,
  <R, E, A, R2, _>(self: Stream.Stream<R, E, A>, finalizer: Effect.Effect<R2, never, _>): Stream.Stream<R | R2, E, A> =>
    new StreamImpl(pipe(toChannel(self), channel.ensuring(finalizer)))
)

/** @internal */
export const ensuringWith = dual<
  <E, R2>(
    finalizer: (exit: Exit.Exit<E, unknown>) => Effect.Effect<R2, never, unknown>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R | R2, E, A>,
  <R, E, A, R2>(
    self: Stream.Stream<R, E, A>,
    finalizer: (exit: Exit.Exit<E, unknown>) => Effect.Effect<R2, never, unknown>
  ) => Stream.Stream<R | R2, E, A>
>(2, (self, finalizer) => new StreamImpl(core.ensuringWith(toChannel(self), finalizer)))

/** @internal */
export const context = <R>(): Stream.Stream<R, never, Context.Context<R>> => fromEffect(Effect.context<R>())

/** @internal */
export const contextWith = <R, A>(f: (env: Context.Context<R>) => A): Stream.Stream<R, never, A> =>
  pipe(context<R>(), map(f))

/** @internal */
export const contextWithEffect = <R0, R, E, A>(
  f: (env: Context.Context<R0>) => Effect.Effect<R, E, A>
): Stream.Stream<R0 | R, E, A> => pipe(context<R0>(), mapEffectSequential(f))

/** @internal */
export const contextWithStream = <R0, R, E, A>(
  f: (env: Context.Context<R0>) => Stream.Stream<R, E, A>
): Stream.Stream<R0 | R, E, A> => pipe(context<R0>(), flatMap(f))

/** @internal */
export const execute = <R, E, _>(effect: Effect.Effect<R, E, _>): Stream.Stream<R, E, never> =>
  drain(fromEffect(effect))

/** @internal */
export const fail = <E>(error: E): Stream.Stream<never, E, never> => fromEffectOption(Effect.fail(Option.some(error)))

/** @internal */
export const failSync = <E>(evaluate: LazyArg<E>): Stream.Stream<never, E, never> =>
  fromEffectOption(Effect.failSync(() => Option.some(evaluate())))

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Stream.Stream<never, E, never> =>
  fromEffect(Effect.failCause(cause))

/** @internal */
export const failCauseSync = <E>(evaluate: LazyArg<Cause.Cause<E>>): Stream.Stream<never, E, never> =>
  fromEffect(Effect.failCauseSync(evaluate))

/** @internal */
export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, B>
  <A, B extends A>(predicate: Predicate<B>): <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>
  <R, E, A, B extends A>(self: Stream.Stream<R, E, A>, refinement: Refinement<A, B>): Stream.Stream<R, E, B>
  <R, E, A>(self: Stream.Stream<R, E, A>, predicate: Predicate<A>): Stream.Stream<R, E, A>
} = dual(
  2,
  <R, E, A>(self: Stream.Stream<R, E, A>, predicate: Predicate<A>) => mapChunks(self, Chunk.filter(predicate))
)

/** @internal */
export const filterEffect = dual<
  <A, X extends A, R2, E2>(
    f: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, X extends A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    f: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, X extends A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    f: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream.Stream<R | R2, E | E2, A> => {
    const loop = (
      iterator: Iterator<A>
    ): Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, unknown> => {
      const next = iterator.next()
      if (next.done) {
        return core.readWithCause({
          onInput: (input) => loop(input[Symbol.iterator]()),
          onFailure: core.failCause,
          onDone: core.succeed
        })
      } else {
        return pipe(
          f(next.value as X),
          Effect.map((bool) =>
            bool ?
              pipe(core.write(Chunk.of(next.value)), core.flatMap(() => loop(iterator))) :
              loop(iterator)
          ),
          channel.unwrap
        )
      }
    }
    return new StreamImpl(
      core.suspend(() => pipe(toChannel(self), core.pipeTo(loop(Chunk.empty<A>()[Symbol.iterator]()))))
    )
  }
)

/** @internal */
export const filterMap = dual<
  <A, B>(pf: (a: A) => Option.Option<B>) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, B>,
  <R, E, A, B>(self: Stream.Stream<R, E, A>, pf: (a: A) => Option.Option<B>) => Stream.Stream<R, E, B>
>(
  2,
  <R, E, A, B>(self: Stream.Stream<R, E, A>, pf: (a: A) => Option.Option<B>): Stream.Stream<R, E, B> =>
    mapChunks(self, Chunk.filterMap(pf))
)

/** @internal */
export const filterMapEffect = dual<
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): Stream.Stream<R | R2, E | E2, A2> =>
    suspend(() => {
      const loop = (
        iterator: Iterator<A>
      ): Channel.Channel<R | R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A2>, unknown> => {
        const next = iterator.next()
        if (next.done) {
          return core.readWithCause({
            onInput: (input) => loop(input[Symbol.iterator]()),
            onFailure: core.failCause,
            onDone: core.succeed
          })
        } else {
          return pipe(
            pf(next.value),
            Option.match({
              onNone: () => Effect.sync(() => loop(iterator)),
              onSome: Effect.map((a2) => core.flatMap(core.write(Chunk.of(a2)), () => loop(iterator)))
            }),
            channel.unwrap
          )
        }
      }
      return new StreamImpl(pipe(toChannel(self), core.pipeTo(loop(Chunk.empty<A>()[Symbol.iterator]()))))
    })
)

/** @internal */
export const filterMapWhile = dual<
  <A, A2>(
    pf: (a: A) => Option.Option<A2>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2>,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, pf: (a: A) => Option.Option<A2>) => Stream.Stream<R, E, A2>
>(
  2,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, pf: (a: A) => Option.Option<A2>) => {
    const loop: Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A2>, unknown> = core.readWith({
      onInput: (input: Chunk.Chunk<A>) => {
        const mapped = Chunk.filterMapWhile(input, pf)
        if (mapped.length === input.length) {
          return pipe(core.write(mapped), core.flatMap(() => loop))
        }
        return core.write(mapped)
      },
      onFailure: core.fail,
      onDone: core.succeed
    })
    return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(loop)))
  }
)

/** @internal */
export const filterMapWhileEffect = dual<
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): Stream.Stream<R | R2, E | E2, A2> =>
    suspend(() => {
      const loop = (
        iterator: Iterator<A>
      ): Channel.Channel<R | R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A2>, unknown> => {
        const next = iterator.next()
        if (next.done) {
          return core.readWithCause({
            onInput: (input) => loop(input[Symbol.iterator]()),
            onFailure: core.failCause,
            onDone: core.succeed
          })
        } else {
          return channel.unwrap(
            Option.match(pf(next.value), {
              onNone: () => Effect.succeed(core.unit),
              onSome: Effect.map(
                (a2) => core.flatMap(core.write(Chunk.of(a2)), () => loop(iterator))
              )
            })
          )
        }
      }
      return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(loop(Chunk.empty<A>()[Symbol.iterator]()))))
    })
)

/** @internal */
export const finalizer = <R, _>(finalizer: Effect.Effect<R, never, _>): Stream.Stream<R, never, void> =>
  acquireRelease(Effect.unit, () => finalizer)

/** @internal */
export const find = dual<
  {
    <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, B>
    <A, X extends A>(predicate: Predicate<X>): <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>
  },
  {
    <R, E, A, B extends A>(self: Stream.Stream<R, E, A>, refinement: Refinement<A, B>): Stream.Stream<R, E, B>
    <R, E, A, X extends A>(self: Stream.Stream<R, E, A>, predicate: Predicate<X>): Stream.Stream<R, E, A>
  }
>(2, <R, E, A, X extends A>(self: Stream.Stream<R, E, A>, predicate: Predicate<X>): Stream.Stream<R, E, A> => {
  const loop: Channel.Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> = core.readWith({
    onInput: (input: Chunk.Chunk<A>) =>
      Option.match(Chunk.findFirst(input, predicate as Predicate<A>), {
        onNone: () => loop,
        onSome: (n) => core.write(Chunk.of(n))
      }),
    onFailure: core.fail,
    onDone: () => core.unit
  })
  return new StreamImpl(pipe(toChannel(self), core.pipeTo(loop)))
})

/** @internal */
export const findEffect = dual<
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, X extends A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, X extends A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream.Stream<R | R2, E | E2, A> => {
    const loop: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, unknown> = core.readWith({
      onInput: (input: Chunk.Chunk<A>) =>
        pipe(
          Effect.findFirst(input, predicate as (a: A) => Effect.Effect<R2, E2, boolean>),
          Effect.map(Option.match({
            onNone: () => loop,
            onSome: (n) => core.write(Chunk.of(n))
          })),
          channel.unwrap
        ),
      onFailure: core.fail,
      onDone: () => core.unit
    })
    return new StreamImpl(pipe(toChannel(self), core.pipeTo(loop)))
  }
)

/** @internal */
export const flatMap = dual<
  <A, R2, E2, A2>(
    f: (a: A) => Stream.Stream<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Stream.Stream<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    }
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  (args) => isStream(args[0]),
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Stream.Stream<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    }
  ): Stream.Stream<R | R2, E | E2, A2> => {
    const bufferSize = options?.bufferSize ?? 16

    if (options?.switch) {
      return matchConcurrency(
        options?.concurrency,
        () => flatMapParSwitchBuffer(self, 1, bufferSize, f),
        (n) => flatMapParSwitchBuffer(self, n, bufferSize, f)
      )
    }

    return matchConcurrency(
      options?.concurrency,
      () =>
        new StreamImpl(
          channel.concatMap(
            toChannel(self),
            (as) =>
              pipe(
                as,
                Chunk.map((a) => toChannel(f(a))),
                Chunk.reduce(
                  core.unit as Channel.Channel<R2, unknown, unknown, unknown, E2, Chunk.Chunk<A2>, unknown>,
                  (left, right) => pipe(left, channel.zipRight(right))
                )
              )
          )
        ),
      (_) =>
        new StreamImpl(
          pipe(
            toChannel(self),
            channel.concatMap(channel.writeChunk),
            channel.mergeMap((out) => toChannel(f(out)), options as any)
          )
        )
    )
  }
)

/** @internal */
export const matchConcurrency = <A>(
  concurrency: number | "unbounded" | undefined,
  sequential: () => A,
  bounded: (n: number) => A
) => {
  switch (concurrency) {
    case undefined:
      return sequential()
    case "unbounded":
      return bounded(Number.MAX_SAFE_INTEGER)
    default:
      return concurrency > 1 ? bounded(concurrency) : sequential()
  }
}

const flatMapParSwitchBuffer = dual<
  <A, R2, E2, A2>(
    n: number,
    bufferSize: number,
    f: (a: A) => Stream.Stream<R2, E2, A2>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    n: number,
    bufferSize: number,
    f: (a: A) => Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  4,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    n: number,
    bufferSize: number,
    f: (a: A) => Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A2> =>
    new StreamImpl(
      pipe(
        toChannel(self),
        channel.concatMap(channel.writeChunk),
        channel.mergeMap((out) => toChannel(f(out)), {
          concurrency: n,
          mergeStrategy: MergeStrategy.BufferSliding(),
          bufferSize
        })
      )
    )
)

/** @internal */
export const flatten = dual<
  (options?: {
    readonly concurrency?: number | "unbounded" | undefined
    readonly bufferSize?: number | undefined
  }) => <R, E, R2, E2, A>(
    self: Stream.Stream<R, E, Stream.Stream<R2, E2, A>>
  ) => Stream.Stream<R | R2, E | E2, A>,
  <R, E, R2, E2, A>(
    self: Stream.Stream<R, E, Stream.Stream<R2, E2, A>>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ) => Stream.Stream<R | R2, E | E2, A>
>((args) => isStream(args[0]), (self, options) => flatMap(self, identity, options))

/** @internal */
export const flattenChunks = <R, E, A>(self: Stream.Stream<R, E, Chunk.Chunk<A>>): Stream.Stream<R, E, A> => {
  const flatten: Channel.Channel<never, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown, E, Chunk.Chunk<A>, unknown> = core
    .readWithCause({
      onInput: (chunks: Chunk.Chunk<Chunk.Chunk<A>>) =>
        core.flatMap(
          channel.writeChunk(chunks),
          () => flatten
        ),
      onFailure: core.failCause,
      onDone: () => core.unit
    })
  return new StreamImpl(pipe(toChannel(self), core.pipeTo(flatten)))
}

/** @internal */
export const flattenEffect = dual<
  (
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly unordered?: boolean | undefined
    }
  ) => <R, E, R2, E2, A>(
    self: Stream.Stream<R, E, Effect.Effect<R2, E2, A>>
  ) => Stream.Stream<R | R2, E | E2, A>,
  <R, E, R2, E2, A>(
    self: Stream.Stream<R, E, Effect.Effect<R2, E2, A>>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly unordered?: boolean | undefined
    }
  ) => Stream.Stream<R | R2, E | E2, A>
>(
  (args) => isStream(args[0]),
  (self, options) =>
    options?.unordered ?
      flatMap(self, (a) => fromEffect(a), { concurrency: options.concurrency }) :
      matchConcurrency(
        options?.concurrency,
        () => mapEffectSequential(self, identity),
        (n) =>
          new StreamImpl(
            pipe(
              toChannel(self),
              channel.concatMap(channel.writeChunk),
              channel.mapOutEffectPar(identity, n),
              channel.mapOut(Chunk.of)
            )
          )
      )
)

/** @internal */
export const flattenExitOption = <R, E, E2, A>(
  self: Stream.Stream<R, E, Exit.Exit<Option.Option<E2>, A>>
): Stream.Stream<R, E | E2, A> => {
  const processChunk = (
    chunk: Chunk.Chunk<Exit.Exit<Option.Option<E2>, A>>,
    cont: Channel.Channel<R, E, Chunk.Chunk<Exit.Exit<Option.Option<E2>, A>>, unknown, E | E2, Chunk.Chunk<A>, unknown>
  ) => {
    const [toEmit, rest] = pipe(chunk, Chunk.splitWhere((exit) => !Exit.isSuccess(exit)))
    const next = pipe(
      Chunk.head(rest),
      Option.match({
        onNone: () => cont,
        onSome: Exit.match({
          onFailure: (cause) =>
            Option.match(Cause.flipCauseOption(cause), {
              onNone: () => core.unit,
              onSome: core.failCause
            }),
          onSuccess: () => core.unit
        })
      })
    )
    return pipe(
      core.write(pipe(
        toEmit,
        Chunk.filterMap((exit) =>
          Exit.isSuccess(exit) ?
            Option.some(exit.value) :
            Option.none()
        )
      )),
      core.flatMap(() => next)
    )
  }
  const process: Channel.Channel<
    R,
    E,
    Chunk.Chunk<Exit.Exit<Option.Option<E2>, A>>,
    unknown,
    E | E2,
    Chunk.Chunk<A>,
    unknown
  > = core.readWithCause({
    onInput: (chunk: Chunk.Chunk<Exit.Exit<Option.Option<E2>, A>>) => processChunk(chunk, process),
    onFailure: (cause) => core.failCause<E | E2>(cause),
    onDone: () => core.unit
  })
  return new StreamImpl(pipe(toChannel(self), core.pipeTo(process)))
}

/** @internal */
export const flattenIterables = <R, E, A>(self: Stream.Stream<R, E, Iterable<A>>): Stream.Stream<R, E, A> =>
  pipe(self, map(Chunk.fromIterable), flattenChunks)

/** @internal */
export const flattenTake = <R, E, E2, A>(self: Stream.Stream<R, E, Take.Take<E2, A>>): Stream.Stream<R, E | E2, A> =>
  flattenChunks(flattenExitOption(pipe(self, map((take) => take.exit))))

/** @internal */
export const forever = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, E, A> =>
  new StreamImpl(channel.repeated(toChannel(self)))

/** @internal */
export const fromAsyncIterable = <E, A>(
  iterable: AsyncIterable<A>,
  onError: (e: unknown) => E
) =>
  pipe(
    Effect.acquireRelease(
      Effect.sync(() => iterable[Symbol.asyncIterator]()),
      (iterator) => iterator.return ? Effect.promise(async () => iterator.return!()) : Effect.unit
    ),
    Effect.map((iterator) =>
      repeatEffectOption(pipe(
        Effect.tryPromise({
          try: async () => iterator.next(),
          catch: (reason) => Option.some(onError(reason))
        }),
        Effect.flatMap((result) => result.done ? Effect.fail(Option.none()) : Effect.succeed(result.value))
      ))
    ),
    unwrapScoped
  )

/** @internal */
export const fromChannel = <R, E, A>(
  channel: Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown>
): Stream.Stream<R, E, A> => new StreamImpl(channel)

/** @internal */
export const toChannel = <R, E, A>(
  stream: Stream.Stream<R, E, A>
): Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown> => {
  if ("channel" in stream) {
    return (stream as StreamImpl<R, E, A>).channel
  } else if (Effect.isEffect(stream)) {
    return toChannel(fromEffect(stream)) as any
  } else {
    throw new TypeError(`Expected a Stream.`)
  }
}

/** @internal */
export const fromChunk = <A>(chunk: Chunk.Chunk<A>): Stream.Stream<never, never, A> =>
  new StreamImpl(Chunk.isEmpty(chunk) ? core.unit : core.write(chunk))

/** @internal */
export const fromChunkPubSub: {
  <A>(pubsub: PubSub.PubSub<Chunk.Chunk<A>>, options: {
    readonly scoped: true
    readonly shutdown?: boolean | undefined
  }): Effect.Effect<Scope.Scope, never, Stream.Stream<never, never, A>>
  <A>(pubsub: PubSub.PubSub<Chunk.Chunk<A>>, options?: {
    readonly scoped?: false | undefined
    readonly shutdown?: boolean | undefined
  }): Stream.Stream<never, never, A>
} = (pubsub, options): any => {
  if (options?.scoped) {
    const effect = Effect.map(PubSub.subscribe(pubsub), fromChunkQueue)
    return options.shutdown ? Effect.map(effect, ensuring(PubSub.shutdown(pubsub))) : effect
  }
  const stream = flatMap(scoped(PubSub.subscribe(pubsub)), fromChunkQueue)
  return options?.shutdown ? ensuring(stream, PubSub.shutdown(pubsub)) : stream
}

/** @internal */
export const fromChunkQueue = <A>(queue: Queue.Dequeue<Chunk.Chunk<A>>, options?: {
  readonly shutdown?: boolean | undefined
}): Stream.Stream<never, never, A> =>
  pipe(
    Queue.take(queue),
    Effect.catchAllCause((cause) =>
      pipe(
        Queue.isShutdown(queue),
        Effect.flatMap((isShutdown) =>
          isShutdown && Cause.isInterrupted(cause) ?
            pull.end() :
            pull.failCause(cause)
        )
      )
    ),
    repeatEffectChunkOption,
    options?.shutdown ? ensuring(Queue.shutdown(queue)) : identity
  )

/** @internal */
export const fromChunks = <A>(
  ...chunks: Array<Chunk.Chunk<A>>
): Stream.Stream<never, never, A> => pipe(fromIterable(chunks), flatMap(fromChunk))

/** @internal */
export const fromEffect = <R, E, A>(effect: Effect.Effect<R, E, A>): Stream.Stream<R, E, A> =>
  pipe(effect, Effect.mapError(Option.some), fromEffectOption)

/** @internal */
export const fromEffectOption = <R, E, A>(effect: Effect.Effect<R, Option.Option<E>, A>): Stream.Stream<R, E, A> =>
  new StreamImpl(
    channel.unwrap(
      Effect.match(effect, {
        onFailure: Option.match({
          onNone: () => core.unit,
          onSome: core.fail
        }),
        onSuccess: (a) => core.write(Chunk.of(a))
      })
    )
  )

/** @internal */
export const fromPubSub: {
  <A>(pubsub: PubSub.PubSub<A>, options: {
    readonly scoped: true
    readonly maxChunkSize?: number | undefined
    readonly shutdown?: boolean | undefined
  }): Effect.Effect<Scope.Scope, never, Stream.Stream<never, never, A>>
  <A>(pubsub: PubSub.PubSub<A>, options?: {
    readonly scoped?: false | undefined
    readonly maxChunkSize?: number | undefined
    readonly shutdown?: boolean | undefined
  }): Stream.Stream<never, never, A>
} = (pubsub, options): any => {
  const maxChunkSize = options?.maxChunkSize ?? DefaultChunkSize

  if (options?.scoped) {
    const effect = Effect.map(
      PubSub.subscribe(pubsub),
      (queue) => fromQueue(queue, { maxChunkSize, shutdown: true })
    )

    return options.shutdown ? Effect.map(effect, ensuring(PubSub.shutdown(pubsub))) : effect
  }
  const stream = flatMap(
    scoped(PubSub.subscribe(pubsub)),
    (queue) => fromQueue(queue, { maxChunkSize })
  )
  return options?.shutdown ? ensuring(stream, PubSub.shutdown(pubsub)) : stream
}

/** @internal */
export const fromIterable = <A>(iterable: Iterable<A>): Stream.Stream<never, never, A> =>
  suspend(() =>
    Chunk.isChunk(iterable) ?
      fromChunk(iterable) :
      fromIteratorSucceed(iterable[Symbol.iterator]())
  )

/** @internal */
export const fromIterableEffect = <R, E, A>(
  effect: Effect.Effect<R, E, Iterable<A>>
): Stream.Stream<R, E, A> => pipe(effect, Effect.map(fromIterable), unwrap)

/** @internal */
export const fromIteratorSucceed = <A>(
  iterator: Iterator<A>,
  maxChunkSize = DefaultChunkSize
): Stream.Stream<never, never, A> => {
  return pipe(
    Effect.sync(() => {
      let builder: Array<A> = []
      const loop = (
        iterator: Iterator<A>
      ): Channel.Channel<never, unknown, unknown, unknown, never, Chunk.Chunk<A>, unknown> =>
        pipe(
          Effect.sync(() => {
            let next: IteratorResult<A, any> = iterator.next()
            if (maxChunkSize === 1) {
              if (next.done) {
                return core.unit
              }
              return pipe(
                core.write(Chunk.of(next.value)),
                core.flatMap(() => loop(iterator))
              )
            }
            builder = []
            let count = 0
            while (next.done === false) {
              builder.push(next.value)
              count = count + 1
              if (count >= maxChunkSize) {
                break
              }
              next = iterator.next()
            }
            if (count > 0) {
              return pipe(
                core.write(Chunk.unsafeFromArray(builder)),
                core.flatMap(() => loop(iterator))
              )
            }
            return core.unit
          }),
          channel.unwrap
        )
      return new StreamImpl(loop(iterator))
    }),
    unwrap
  )
}

/** @internal */
export const fromPull = <R, R2, E, A>(
  effect: Effect.Effect<R | Scope.Scope, never, Effect.Effect<R2, Option.Option<E>, Chunk.Chunk<A>>>
): Stream.Stream<Exclude<R, Scope.Scope> | R2, E, A> => pipe(effect, Effect.map(repeatEffectChunkOption), unwrapScoped)

/** @internal */
export const fromQueue = <A>(
  queue: Queue.Dequeue<A>,
  options?: {
    readonly maxChunkSize?: number | undefined
    readonly shutdown?: boolean | undefined
  }
): Stream.Stream<never, never, A> =>
  pipe(
    Queue.takeBetween(queue, 1, options?.maxChunkSize ?? DefaultChunkSize),
    Effect.catchAllCause((cause) =>
      pipe(
        Queue.isShutdown(queue),
        Effect.flatMap((isShutdown) =>
          isShutdown && Cause.isInterrupted(cause) ?
            pull.end() :
            pull.failCause(cause)
        )
      )
    ),
    repeatEffectChunkOption,
    options?.shutdown ? ensuring(Queue.shutdown(queue)) : identity
  )

/** @internal */
export const fromSchedule = <R, A>(schedule: Schedule.Schedule<R, unknown, A>): Stream.Stream<R, never, A> =>
  pipe(
    Schedule.driver(schedule),
    Effect.map((driver) => repeatEffectOption(driver.next(void 0))),
    unwrap
  )

/** @internal */
export const fromReadableStream = <A, E>(
  evaluate: LazyArg<ReadableStream<A>>,
  onError: (error: unknown) => E
): Stream.Stream<never, E, A> =>
  unwrapScoped(Effect.map(
    Effect.acquireRelease(
      Effect.sync(() => evaluate().getReader()),
      (reader) => Effect.promise(() => reader.cancel())
    ),
    (reader) =>
      repeatEffectOption(
        Effect.flatMap(
          Effect.tryPromise({
            try: () => reader.read(),
            catch: (reason) => Option.some(onError(reason))
          }),
          ({ done, value }) => done ? Effect.fail(Option.none()) : Effect.succeed(value)
        )
      )
  ))

/** @internal */
export const fromReadableStreamByob = <E>(
  evaluate: LazyArg<ReadableStream<Uint8Array>>,
  onError: (error: unknown) => E,
  allocSize = 4096
): Stream.Stream<never, E, Uint8Array> =>
  unwrapScoped(Effect.map(
    Effect.acquireRelease(
      Effect.sync(() => evaluate().getReader({ mode: "byob" })),
      (reader) => Effect.promise(() => reader.cancel())
    ),
    (reader) =>
      catchAll(
        forever(readChunkStreamByobReader(reader, onError, allocSize)),
        (error) => isTagged(error, "EOF") ? empty : fail(error as E)
      )
  ))

interface EOF {
  readonly _tag: "EOF"
}

const readChunkStreamByobReader = <E>(
  reader: ReadableStreamBYOBReader,
  onError: (error: unknown) => E,
  size: number
): Stream.Stream<never, E | EOF, Uint8Array> => {
  const buffer = new ArrayBuffer(size)
  return paginateEffect(0, (offset) =>
    Effect.flatMap(
      Effect.tryPromise({
        try: () => reader.read(new Uint8Array(buffer, offset, buffer.byteLength - offset)),
        catch: (reason) => onError(reason)
      }),
      ({ done, value }) => {
        if (done) {
          return Effect.fail({ _tag: "EOF" })
        }
        const newOffset = offset + value.byteLength
        return Effect.succeed([
          value,
          newOffset >= buffer.byteLength
            ? Option.none<number>()
            : Option.some(newOffset)
        ])
      }
    ))
}

/** @internal */
export const groupAdjacentBy = dual<
  <A, K>(
    f: (a: A) => K
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, [K, Chunk.NonEmptyChunk<A>]>,
  <R, E, A, K>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => K
  ) => Stream.Stream<R, E, [K, Chunk.NonEmptyChunk<A>]>
>(
  2,
  <R, E, A, K>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => K
  ): Stream.Stream<R, E, [K, Chunk.NonEmptyChunk<A>]> => {
    type Output = [K, Chunk.NonEmptyChunk<A>]
    const groupAdjacentByChunk = (
      state: Option.Option<Output>,
      chunk: Chunk.Chunk<A>
    ): [Option.Option<Output>, Chunk.Chunk<Output>] => {
      if (Chunk.isEmpty(chunk)) {
        return [state, Chunk.empty()]
      }
      const builder: Array<Output> = []
      let from = 0
      let until = 0
      let key: K | undefined = undefined
      let previousChunk = Chunk.empty<A>()
      switch (state._tag) {
        case "Some": {
          const tuple = state.value
          key = tuple[0]
          let loop = true
          while (loop && until < chunk.length) {
            const input = Chunk.unsafeGet(chunk, until)
            const updatedKey = f(input)
            if (!Equal.equals(key, updatedKey)) {
              const previousChunk = tuple[1]
              const additionalChunk = Chunk.unsafeFromArray(Array.from(chunk).slice(from, until))
              const group = Chunk.appendAll(previousChunk, additionalChunk)
              builder.push([key, group])
              key = updatedKey
              from = until
              loop = false
            }
            until = until + 1
          }
          if (loop) {
            previousChunk = tuple[1]
          }
          break
        }
        case "None": {
          key = f(Chunk.unsafeGet(chunk, until))
          until = until + 1
          break
        }
      }
      while (until < chunk.length) {
        const input = Chunk.unsafeGet(chunk, until)
        const updatedKey = f(input)
        if (!Equal.equals(key, updatedKey)) {
          builder.push([key, Chunk.unsafeFromArray(Array.from(chunk).slice(from, until)) as Chunk.NonEmptyChunk<A>])
          key = updatedKey
          from = until
        }
        until = until + 1
      }
      const nonEmptyChunk = Chunk.appendAll(previousChunk, Chunk.unsafeFromArray(Array.from(chunk).slice(from, until)))
      const output = Chunk.unsafeFromArray(builder)
      return [Option.some([key, nonEmptyChunk as Chunk.NonEmptyChunk<A>]), output]
    }

    const groupAdjacent = (
      state: Option.Option<Output>
    ): Channel.Channel<never, never, Chunk.Chunk<A>, unknown, never, Chunk.Chunk<Output>, unknown> =>
      core.readWithCause({
        onInput: (input: Chunk.Chunk<A>) => {
          const [updatedState, output] = groupAdjacentByChunk(state, input)
          return Chunk.isEmpty(output)
            ? groupAdjacent(updatedState)
            : core.flatMap(core.write(output), () => groupAdjacent(updatedState))
        },
        onFailure: (cause) =>
          Option.match(state, {
            onNone: () => core.failCause(cause),
            onSome: (output) => core.flatMap(core.write(Chunk.of(output)), () => core.failCause(cause))
          }),
        onDone: (done) =>
          Option.match(state, {
            onNone: () => core.succeedNow(done),
            onSome: (output) => core.flatMap(core.write(Chunk.of(output)), () => core.succeedNow(done))
          })
      })
    return new StreamImpl(channel.pipeToOrFail(toChannel(self), groupAdjacent(Option.none())))
  }
)

/** @internal */
export const grouped = dual<
  (chunkSize: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, Chunk.Chunk<A>>,
  <R, E, A>(self: Stream.Stream<R, E, A>, chunkSize: number) => Stream.Stream<R, E, Chunk.Chunk<A>>
>(
  2,
  <R, E, A>(self: Stream.Stream<R, E, A>, chunkSize: number): Stream.Stream<R, E, Chunk.Chunk<A>> =>
    pipe(self, rechunk(chunkSize), chunks)
)

/** @internal */
export const groupedWithin = dual<
  (
    chunkSize: number,
    duration: Duration.DurationInput
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, Chunk.Chunk<A>>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    chunkSize: number,
    duration: Duration.DurationInput
  ) => Stream.Stream<R, E, Chunk.Chunk<A>>
>(
  3,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    chunkSize: number,
    duration: Duration.DurationInput
  ): Stream.Stream<R, E, Chunk.Chunk<A>> =>
    aggregateWithin(self, _sink.collectAllN(chunkSize), Schedule.spaced(duration))
)

/** @internal */
export const haltWhen = dual<
  <R2, E2, _>(
    effect: Effect.Effect<R2, E2, _>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    effect: Effect.Effect<R2, E2, _>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    effect: Effect.Effect<R2, E2, _>
  ): Stream.Stream<R | R2, E | E2, A> => {
    const writer = (
      fiber: Fiber.Fiber<E2, _>
    ): Channel.Channel<R2, E | E2, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, void> =>
      pipe(
        Fiber.poll(fiber),
        Effect.map(Option.match({
          onNone: () =>
            core.readWith({
              onInput: (input: Chunk.Chunk<A>) => core.flatMap(core.write(input), () => writer(fiber)),
              onFailure: core.fail,
              onDone: () => core.unit
            }),
          onSome: Exit.match({
            onFailure: core.failCause,
            onSuccess: () => core.unit
          })
        })),
        channel.unwrap
      )
    return new StreamImpl(
      pipe(
        Effect.forkScoped(effect),
        Effect.map((fiber) => pipe(toChannel(self), core.pipeTo(writer(fiber)))),
        channel.unwrapScoped
      )
    )
  }
)

/** @internal */
export const haltAfter = dual<
  (duration: Duration.DurationInput) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, duration: Duration.DurationInput) => Stream.Stream<R, E, A>
>(
  2,
  <R, E, A>(self: Stream.Stream<R, E, A>, duration: Duration.DurationInput): Stream.Stream<R, E, A> =>
    pipe(self, haltWhen(Clock.sleep(duration)))
)

/** @internal */
export const haltWhenDeferred = dual<
  <E2, _>(deferred: Deferred.Deferred<E2, _>) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2 | E, A>,
  <R, E, A, E2, _>(self: Stream.Stream<R, E, A>, deferred: Deferred.Deferred<E2, _>) => Stream.Stream<R, E2 | E, A>
>(
  2,
  <R, E, A, E2, _>(self: Stream.Stream<R, E, A>, deferred: Deferred.Deferred<E2, _>): Stream.Stream<R, E | E2, A> => {
    const writer: Channel.Channel<R, E | E2, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, void> = pipe(
      Deferred.poll(deferred),
      Effect.map(Option.match({
        onNone: () =>
          core.readWith({
            onInput: (input: Chunk.Chunk<A>) => pipe(core.write(input), core.flatMap(() => writer)),
            onFailure: core.fail,
            onDone: () => core.unit
          }),
        onSome: (effect) =>
          channel.unwrap(Effect.match(effect, {
            onFailure: core.fail,
            onSuccess: () => core.unit
          }))
      })),
      channel.unwrap
    )
    return new StreamImpl(pipe(toChannel(self), core.pipeTo(writer)))
  }
)

/** @internal */
export const identityStream = <R, E, A>(): Stream.Stream<R, E, A> =>
  new StreamImpl(
    channel.identityChannel() as Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown>
  )

/** @internal */
export const interleave = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2 | A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A | A2> => pipe(self, interleaveWith(that, forever(make(true, false))))
)

/** @internal */
export const interleaveWith = dual<
  <R2, E2, A2, R3, E3>(
    that: Stream.Stream<R2, E2, A2>,
    decider: Stream.Stream<R3, E3, boolean>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R3 | R, E2 | E3 | E, A2 | A>,
  <R, E, A, R2, E2, A2, R3, E3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    decider: Stream.Stream<R3, E3, boolean>
  ) => Stream.Stream<R2 | R3 | R, E2 | E3 | E, A2 | A>
>(
  3,
  <R, E, A, R2, E2, A2, R3, E3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    decider: Stream.Stream<R3, E3, boolean>
  ): Stream.Stream<R | R2 | R3, E | E2 | E3, A | A2> => {
    const producer = (
      handoff: Handoff.Handoff<Take.Take<E | E2 | E3, A | A2>>
    ): Channel.Channel<R | R2 | R3, E | E2 | E3, A | A2, unknown, never, never, void> =>
      core.readWithCause({
        onInput: (value: A | A2) =>
          core.flatMap(
            core.fromEffect(
              Handoff.offer<Take.Take<E | E2 | E3, A | A2>>(handoff, _take.of(value))
            ),
            () => producer(handoff)
          ),
        onFailure: (cause) =>
          core.fromEffect(
            Handoff.offer<Take.Take<E | E2 | E3, A | A2>>(
              handoff,
              _take.failCause(cause)
            )
          ),
        onDone: () =>
          core.fromEffect(
            Handoff.offer<Take.Take<E | E2 | E3, A | A2>>(handoff, _take.end)
          )
      })
    return new StreamImpl(
      channel.unwrapScoped(
        pipe(
          Handoff.make<Take.Take<E | E2 | E3, A | A2>>(),
          Effect.zip(Handoff.make<Take.Take<E | E2 | E3, A | A2>>()),
          Effect.tap(([left]) =>
            pipe(
              toChannel(self),
              channel.concatMap(channel.writeChunk),
              core.pipeTo(producer(left)),
              channelExecutor.runScoped,
              Effect.forkScoped
            )
          ),
          Effect.tap(([_, right]) =>
            pipe(
              toChannel(that),
              channel.concatMap(channel.writeChunk),
              core.pipeTo(producer(right)),
              channelExecutor.runScoped,
              Effect.forkScoped
            )
          ),
          Effect.map(([left, right]) => {
            const process = (
              leftDone: boolean,
              rightDone: boolean
            ): Channel.Channel<R, E | E2 | E3, boolean, unknown, E | E2 | E3, Chunk.Chunk<A | A2>, void> =>
              core.readWithCause({
                onInput: (bool: boolean) => {
                  if (bool && !leftDone) {
                    return pipe(
                      core.fromEffect(Handoff.take(left)),
                      core.flatMap(_take.match({
                        onEnd: () => rightDone ? core.unit : process(true, rightDone),
                        onFailure: core.failCause,
                        onSuccess: (chunk) => pipe(core.write(chunk), core.flatMap(() => process(leftDone, rightDone)))
                      }))
                    )
                  }
                  if (!bool && !rightDone) {
                    return pipe(
                      core.fromEffect(Handoff.take(right)),
                      core.flatMap(_take.match({
                        onEnd: () => leftDone ? core.unit : process(leftDone, true),
                        onFailure: core.failCause,
                        onSuccess: (chunk) => pipe(core.write(chunk), core.flatMap(() => process(leftDone, rightDone)))
                      }))
                    )
                  }
                  return process(leftDone, rightDone)
                },
                onFailure: core.failCause,
                onDone: () => core.unit
              })
            return pipe(
              toChannel(decider),
              channel.concatMap(channel.writeChunk),
              core.pipeTo(process(false, false))
            )
          })
        )
      )
    )
  }
)

/** @internal */
export const intersperse = dual<
  <A2>(element: A2) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2 | A>,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, element: A2) => Stream.Stream<R, E, A2 | A>
>(2, <R, E, A, A2>(self: Stream.Stream<R, E, A>, element: A2): Stream.Stream<R, E, A | A2> =>
  new StreamImpl(
    pipe(
      toChannel(self),
      channel.pipeToOrFail(
        core.suspend(() => {
          const writer = (
            isFirst: boolean
          ): Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A | A2>, unknown> =>
            core.readWithCause({
              onInput: (chunk: Chunk.Chunk<A>) => {
                const builder: Array<A | A2> = []
                let flagResult = isFirst
                for (const output of chunk) {
                  if (flagResult) {
                    flagResult = false
                    builder.push(output)
                  } else {
                    builder.push(element)
                    builder.push(output)
                  }
                }
                return pipe(
                  core.write(Chunk.unsafeFromArray(builder)),
                  core.flatMap(() => writer(flagResult))
                )
              },
              onFailure: core.failCause,
              onDone: () => core.unit
            })
          return writer(true)
        })
      )
    )
  ))

/** @internal */
export const intersperseAffixes = dual<
  <A2, A3, A4>(
    options: {
      readonly start: A2
      readonly middle: A3
      readonly end: A4
    }
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2 | A3 | A4 | A>,
  <R, E, A, A2, A3, A4>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly start: A2
      readonly middle: A3
      readonly end: A4
    }
  ) => Stream.Stream<R, E, A2 | A3 | A4 | A>
>(
  2,
  <R, E, A, A2, A3, A4>(
    self: Stream.Stream<R, E, A>,
    { end, middle, start }: {
      readonly start: A2
      readonly middle: A3
      readonly end: A4
    }
  ): Stream.Stream<R, E, A | A2 | A3 | A4> =>
    pipe(
      make(start),
      concat(pipe(self, intersperse(middle))),
      concat(make(end))
    )
)

/** @internal */
export const interruptAfter = dual<
  (duration: Duration.DurationInput) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, duration: Duration.DurationInput) => Stream.Stream<R, E, A>
>(
  2,
  <R, E, A>(self: Stream.Stream<R, E, A>, duration: Duration.DurationInput): Stream.Stream<R, E, A> =>
    pipe(self, interruptWhen(Clock.sleep(duration)))
)

/** @internal */
export const interruptWhen = dual<
  <R2, E2, _>(
    effect: Effect.Effect<R2, E2, _>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    effect: Effect.Effect<R2, E2, _>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    effect: Effect.Effect<R2, E2, _>
  ): Stream.Stream<R | R2, E | E2, A> => new StreamImpl(pipe(toChannel(self), channel.interruptWhen(effect)))
)

/** @internal */
export const interruptWhenDeferred = dual<
  <E2, _>(deferred: Deferred.Deferred<E2, _>) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2 | E, A>,
  <R, E, A, E2, _>(self: Stream.Stream<R, E, A>, deferred: Deferred.Deferred<E2, _>) => Stream.Stream<R, E2 | E, A>
>(
  2,
  <R, E, A, E2, _>(self: Stream.Stream<R, E, A>, deferred: Deferred.Deferred<E2, _>): Stream.Stream<R, E | E2, A> =>
    new StreamImpl(pipe(toChannel(self), channel.interruptWhenDeferred(deferred)))
)

/** @internal */
export const iterate = <A>(value: A, next: (value: A) => A): Stream.Stream<never, never, A> =>
  unfold(value, (a) => Option.some([a, next(a)] as const))

/** @internal */
export const make = <As extends Array<any>>(...as: As): Stream.Stream<never, never, As[number]> => fromIterable(as)

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, B>,
  <R, E, A, B>(self: Stream.Stream<R, E, A>, f: (a: A) => B) => Stream.Stream<R, E, B>
>(
  2,
  <R, E, A, B>(self: Stream.Stream<R, E, A>, f: (a: A) => B): Stream.Stream<R, E, B> =>
    new StreamImpl(pipe(toChannel(self), channel.mapOut(Chunk.map(f))))
)

/** @internal */
export const mapAccum = dual<
  <S, A, A2>(
    s: S,
    f: (s: S, a: A) => readonly [S, A2]
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2>,
  <R, E, S, A, A2>(self: Stream.Stream<R, E, A>, s: S, f: (s: S, a: A) => readonly [S, A2]) => Stream.Stream<R, E, A2>
>(
  3,
  <R, E, S, A, A2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => readonly [S, A2]
  ): Stream.Stream<R, E, A2> => {
    const accumulator = (s: S): Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A2>, void> =>
      core.readWith({
        onInput: (input: Chunk.Chunk<A>) => {
          const [nextS, chunk] = Chunk.mapAccum(input, s, f)
          return core.flatMap(
            core.write(chunk),
            () => accumulator(nextS)
          )
        },
        onFailure: core.fail,
        onDone: () => core.unit
      })
    return new StreamImpl(pipe(toChannel(self), core.pipeTo(accumulator(s))))
  }
)

/** @internal */
export const mapAccumEffect = dual<
  <S, A, R2, E2, A2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, readonly [S, A2]>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, S, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, readonly [S, A2]>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  3,
  <R, E, S, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, readonly [S, A2]>
  ): Stream.Stream<R | R2, E | E2, A2> =>
    suspend(() => {
      const accumulator = (
        s: S
      ): Channel.Channel<R | R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A2>, unknown> =>
        core.readWith({
          onInput: (input: Chunk.Chunk<A>) =>
            pipe(
              Effect.suspend(() => {
                const outputs: Array<A2> = []
                const emit = (output: A2) =>
                  Effect.sync(() => {
                    outputs.push(output)
                  })
                return pipe(
                  input,
                  Effect.reduce(s, (s, a) =>
                    pipe(
                      f(s, a),
                      Effect.flatMap(([s, a]) => pipe(emit(a), Effect.as(s)))
                    )),
                  Effect.match({
                    onFailure: (error) => {
                      if (outputs.length !== 0) {
                        return channel.zipRight(core.write(Chunk.unsafeFromArray(outputs)), core.fail(error))
                      }
                      return core.fail(error)
                    },
                    onSuccess: (s) => core.flatMap(core.write(Chunk.unsafeFromArray(outputs)), () => accumulator(s))
                  })
                )
              }),
              channel.unwrap
            ),
          onFailure: core.fail,
          onDone: () => core.unit
        })
      return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(accumulator(s))))
    })
)

/** @internal */
export const mapBoth = dual<
  <E, E2, A, A2>(
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ) => <R>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2, A2>,
  <R, E, E2, A, A2>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ) => Stream.Stream<R, E2, A2>
>(
  2,
  <R, E, E2, A, A2>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly onFailure: (e: E) => E2
      readonly onSuccess: (a: A) => A2
    }
  ): Stream.Stream<R, E2, A2> => pipe(self, mapError(options.onFailure), map(options.onSuccess))
)

/** @internal */
export const mapChunks = dual<
  <A, B>(
    f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, B>,
  <R, E, A, B>(self: Stream.Stream<R, E, A>, f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>) => Stream.Stream<R, E, B>
>(
  2,
  <R, E, A, B>(self: Stream.Stream<R, E, A>, f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>): Stream.Stream<R, E, B> =>
    new StreamImpl(pipe(toChannel(self), channel.mapOut(f)))
)

/** @internal */
export const mapChunksEffect = dual<
  <A, R2, E2, B>(
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, Chunk.Chunk<B>>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, B>,
  <R, E, A, R2, E2, B>(
    self: Stream.Stream<R, E, A>,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, Chunk.Chunk<B>>
  ) => Stream.Stream<R2 | R, E2 | E, B>
>(
  2,
  <R, E, A, R2, E2, B>(
    self: Stream.Stream<R, E, A>,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, Chunk.Chunk<B>>
  ): Stream.Stream<R | R2, E | E2, B> => new StreamImpl(pipe(toChannel(self), channel.mapOutEffect(f)))
)

/** @internal */
export const mapConcat = dual<
  <A, A2>(f: (a: A) => Iterable<A2>) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2>,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, f: (a: A) => Iterable<A2>) => Stream.Stream<R, E, A2>
>(
  2,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, f: (a: A) => Iterable<A2>): Stream.Stream<R, E, A2> =>
    pipe(self, mapConcatChunk((a) => Chunk.fromIterable(f(a))))
)

/** @internal */
export const mapConcatChunk = dual<
  <A, A2>(f: (a: A) => Chunk.Chunk<A2>) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2>,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, f: (a: A) => Chunk.Chunk<A2>) => Stream.Stream<R, E, A2>
>(
  2,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, f: (a: A) => Chunk.Chunk<A2>): Stream.Stream<R, E, A2> =>
    pipe(self, mapChunks(Chunk.flatMap(f)))
)

/** @internal */
export const mapConcatChunkEffect = dual<
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, Chunk.Chunk<A2>>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, Chunk.Chunk<A2>>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, Chunk.Chunk<A2>>
  ): Stream.Stream<R | R2, E | E2, A2> => pipe(self, mapEffectSequential(f), mapConcatChunk(identity))
)

/** @internal */
export const mapConcatEffect = dual<
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, Iterable<A2>>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, Iterable<A2>>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, Iterable<A2>>
  ): Stream.Stream<R | R2, E | E2, A2> =>
    pipe(self, mapEffectSequential((a) => pipe(f(a), Effect.map(Chunk.fromIterable))), mapConcatChunk(identity))
)

/** @internal */
export const mapEffectSequential = dual<
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, A2>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A2> => {
    const loop = (
      iterator: Iterator<A>
    ): Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A2>, unknown> => {
      const next = iterator.next()
      if (next.done) {
        return core.readWithCause({
          onInput: (elem) => loop(elem[Symbol.iterator]()),
          onFailure: core.failCause,
          onDone: core.succeed
        })
      } else {
        const value = next.value
        return channel.unwrap(
          Effect.map(f(value), (a2) =>
            core.flatMap(
              core.write(Chunk.of(a2)),
              () => loop(iterator)
            ))
        )
      }
    }
    return new StreamImpl(pipe(
      toChannel(self),
      core.pipeTo(core.suspend(() => loop(Chunk.empty<A>()[Symbol.iterator]())))
    ))
  }
)

/** @internal */
export const mapEffectPar = dual<
  <A, R2, E2, A2>(
    n: number,
    f: (a: A) => Effect.Effect<R2, E2, A2>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    n: number,
    f: (a: A) => Effect.Effect<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  3,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    n: number,
    f: (a: A) => Effect.Effect<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A2> =>
    new StreamImpl(
      pipe(
        toChannel(self),
        channel.concatMap(channel.writeChunk),
        channel.mapOutEffectPar(f, n),
        channel.mapOut(Chunk.of)
      )
    )
)

/** @internal */
export const mapError = dual<
  <E, E2>(f: (error: E) => E2) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2, A>,
  <R, A, E, E2>(self: Stream.Stream<R, E, A>, f: (error: E) => E2) => Stream.Stream<R, E2, A>
>(
  2,
  <R, A, E, E2>(self: Stream.Stream<R, E, A>, f: (error: E) => E2): Stream.Stream<R, E2, A> =>
    new StreamImpl(pipe(toChannel(self), channel.mapError(f)))
)

/** @internal */
export const mapErrorCause = dual<
  <E, E2>(
    f: (cause: Cause.Cause<E>) => Cause.Cause<E2>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2, A>,
  <R, A, E, E2>(self: Stream.Stream<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>) => Stream.Stream<R, E2, A>
>(
  2,
  <R, A, E, E2>(self: Stream.Stream<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Stream.Stream<R, E2, A> =>
    new StreamImpl(pipe(toChannel(self), channel.mapErrorCause(f)))
)

/** @internal */
export const merge = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>,
    options?: {
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    options?: {
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ) => Stream.Stream<R2 | R, E2 | E, A2 | A>
>(
  (args) => isStream(args[1]),
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    options?: {
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): Stream.Stream<R | R2, E | E2, A | A2> =>
    mergeWith(self, that, {
      onSelf: identity,
      onOther: identity,
      haltStrategy: options?.haltStrategy
    })
)

/** @internal */
export const mergeAll = dual<
  (options: {
    readonly concurrency: number | "unbounded"
    readonly bufferSize?: number | undefined
  }) => <R, E, A>(streams: Iterable<Stream.Stream<R, E, A>>) => Stream.Stream<R, E, A>,
  <R, E, A>(streams: Iterable<Stream.Stream<R, E, A>>, options: {
    readonly concurrency: number | "unbounded"
    readonly bufferSize?: number | undefined
  }) => Stream.Stream<R, E, A>
>((args) => Symbol.iterator in args[0], (streams, options) => flatten(fromIterable(streams), options))

/** @internal */
export const mergeEither = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, Either.Either<A, A2>>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, Either.Either<A, A2>>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, Either.Either<A, A2>> =>
    mergeWith(self, that, { onSelf: Either.left, onOther: Either.right })
)

/** @internal */
export const mergeLeft = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A> => pipe(self, merge(drain(that)))
)

/** @internal */
export const mergeRight = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A2> => pipe(drain(self), merge(that))
)

/** @internal */
export const mergeWith = dual<
  <R2, E2, A2, A, A3, A4>(
    other: Stream.Stream<R2, E2, A2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A3 | A4>,
  <R, E, R2, E2, A2, A, A3, A4>(
    self: Stream.Stream<R, E, A>,
    other: Stream.Stream<R2, E2, A2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ) => Stream.Stream<R2 | R, E2 | E, A3 | A4>
>(
  3,
  <R, E, R2, E2, A2, A, A3, A4>(
    self: Stream.Stream<R, E, A>,
    other: Stream.Stream<R2, E2, A2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): Stream.Stream<R | R2, E | E2, A3 | A4> => {
    const strategy = options.haltStrategy ? haltStrategy.fromInput(options.haltStrategy) : HaltStrategy.Both
    const handler =
      (terminate: boolean) =>
      (exit: Exit.Exit<E | E2, unknown>): MergeDecision.MergeDecision<R | R2, E | E2, unknown, E | E2, unknown> =>
        terminate || !Exit.isSuccess(exit) ?
          // TODO: remove
          MergeDecision.Done(Effect.suspend(() => exit)) :
          MergeDecision.Await((exit) => Effect.suspend(() => exit))

    return new StreamImpl<R | R2, E | E2, A3 | A4>(
      channel.mergeWith(toChannel(map(self, options.onSelf)), {
        other: toChannel(map(other, options.onOther)),
        onSelfDone: handler(strategy._tag === "Either" || strategy._tag === "Left"),
        onOtherDone: handler(strategy._tag === "Either" || strategy._tag === "Right")
      })
    )
  }
)

/** @internal */
export const mkString = <R, E>(self: Stream.Stream<R, E, string>): Effect.Effect<R, E, string> =>
  run(self, _sink.mkString)

/** @internal */
export const never: Stream.Stream<never, never, never> = fromEffect(Effect.never)

/** @internal */
export const onError = dual<
  <E, R2, _>(
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, _>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, A>,
  <R, A, E, R2, _>(
    self: Stream.Stream<R, E, A>,
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, _>
  ) => Stream.Stream<R2 | R, E, A>
>(
  2,
  <R, A, E, R2, _>(
    self: Stream.Stream<R, E, A>,
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, _>
  ): Stream.Stream<R | R2, E, A> =>
    pipe(self, catchAllCause((cause) => fromEffect(pipe(cleanup(cause), Effect.zipRight(Effect.failCause(cause))))))
)

/** @internal */
export const onDone = dual<
  <R2, _>(
    cleanup: () => Effect.Effect<R2, never, _>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, A>,
  <R, E, A, R2, _>(
    self: Stream.Stream<R, E, A>,
    cleanup: () => Effect.Effect<R2, never, _>
  ) => Stream.Stream<R2 | R, E, A>
>(
  2,
  <R, E, A, R2, _>(
    self: Stream.Stream<R, E, A>,
    cleanup: () => Effect.Effect<R2, never, _>
  ): Stream.Stream<R | R2, E, A> =>
    new StreamImpl<R | R2, E, A>(
      pipe(toChannel(self), core.ensuringWith((exit) => Exit.isSuccess(exit) ? cleanup() : Effect.unit))
    )
)

/** @internal */
export const orDie = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, never, A> =>
  pipe(self, orDieWith(identity))

/** @internal */
export const orDieWith = dual<
  <E>(f: (e: E) => unknown) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, never, A>,
  <R, A, E>(self: Stream.Stream<R, E, A>, f: (e: E) => unknown) => Stream.Stream<R, never, A>
>(
  2,
  <R, A, E>(self: Stream.Stream<R, E, A>, f: (e: E) => unknown): Stream.Stream<R, never, A> =>
    new StreamImpl(pipe(toChannel(self), channel.orDieWith(f)))
)

/** @internal */
export const orElse = dual<
  <R2, E2, A2>(
    that: LazyArg<Stream.Stream<R2, E2, A2>>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: LazyArg<Stream.Stream<R2, E2, A2>>
  ) => Stream.Stream<R2 | R, E2, A2 | A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: LazyArg<Stream.Stream<R2, E2, A2>>
  ): Stream.Stream<R | R2, E2, A | A2> =>
    new StreamImpl<R | R2, E2, A | A2>(pipe(toChannel(self), channel.orElse(() => toChannel(that()))))
)

/** @internal */
export const orElseEither = dual<
  <R2, E2, A2>(
    that: LazyArg<Stream.Stream<R2, E2, A2>>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2, Either.Either<A, A2>>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: LazyArg<Stream.Stream<R2, E2, A2>>
  ) => Stream.Stream<R2 | R, E2, Either.Either<A, A2>>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: LazyArg<Stream.Stream<R2, E2, A2>>
  ): Stream.Stream<R | R2, E2, Either.Either<A, A2>> =>
    pipe(self, map(Either.left), orElse(() => pipe(that(), map(Either.right))))
)

/** @internal */
export const orElseFail = dual<
  <E2>(error: LazyArg<E2>) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2, A>,
  <R, E, A, E2>(self: Stream.Stream<R, E, A>, error: LazyArg<E2>) => Stream.Stream<R, E2, A>
>(
  2,
  <R, E, A, E2>(self: Stream.Stream<R, E, A>, error: LazyArg<E2>): Stream.Stream<R, E2, A> =>
    pipe(self, orElse(() => failSync(error)))
)

/** @internal */
export const orElseIfEmpty = dual<
  <A2>(element: LazyArg<A2>) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2 | A>,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, element: LazyArg<A2>) => Stream.Stream<R, E, A2 | A>
>(
  2,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, element: LazyArg<A2>): Stream.Stream<R, E, A | A2> =>
    pipe(self, orElseIfEmptyChunk(() => Chunk.of(element())))
)

/** @internal */
export const orElseIfEmptyChunk = dual<
  <A2>(chunk: LazyArg<Chunk.Chunk<A2>>) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2 | A>,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, chunk: LazyArg<Chunk.Chunk<A2>>) => Stream.Stream<R, E, A2 | A>
>(
  2,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, chunk: LazyArg<Chunk.Chunk<A2>>): Stream.Stream<R, E, A | A2> =>
    pipe(self, orElseIfEmptyStream(() => new StreamImpl(core.write(chunk()))))
)

/** @internal */
export const orElseIfEmptyStream = dual<
  <R2, E2, A2>(
    stream: LazyArg<Stream.Stream<R2, E2, A2>>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    stream: LazyArg<Stream.Stream<R2, E2, A2>>
  ) => Stream.Stream<R2 | R, E2 | E, A2 | A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    stream: LazyArg<Stream.Stream<R2, E2, A2>>
  ): Stream.Stream<R | R2, E | E2, A | A2> => {
    const writer: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A | A2>, unknown> = core.readWith(
      {
        onInput: (input: Chunk.Chunk<A>) => {
          if (Chunk.isEmpty(input)) {
            return core.suspend(() => writer)
          }
          return pipe(
            core.write(input),
            channel.zipRight(channel.identityChannel<E, Chunk.Chunk<A>, unknown>())
          )
        },
        onFailure: core.fail,
        onDone: () => core.suspend(() => toChannel(stream()))
      }
    )
    return new StreamImpl(pipe(toChannel(self), core.pipeTo(writer)))
  }
)

/** @internal */
export const orElseSucceed = dual<
  <A2>(value: LazyArg<A2>) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, never, A2 | A>,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, value: LazyArg<A2>) => Stream.Stream<R, never, A2 | A>
>(
  2,
  <R, E, A, A2>(self: Stream.Stream<R, E, A>, value: LazyArg<A2>): Stream.Stream<R, never, A | A2> =>
    pipe(self, orElse(() => sync(value)))
)

/** @internal */
export const paginate = <S, A>(s: S, f: (s: S) => readonly [A, Option.Option<S>]): Stream.Stream<never, never, A> =>
  paginateChunk(s, (s) => {
    const page = f(s)
    return [Chunk.of(page[0]), page[1]] as const
  })

/** @internal */
export const paginateChunk = <S, A>(
  s: S,
  f: (s: S) => readonly [Chunk.Chunk<A>, Option.Option<S>]
): Stream.Stream<never, never, A> => {
  const loop = (s: S): Channel.Channel<never, unknown, unknown, unknown, never, Chunk.Chunk<A>, unknown> => {
    const page = f(s)
    return Option.match(page[1], {
      onNone: () => channel.zipRight(core.write(page[0]), core.unit),
      onSome: (s) => core.flatMap(core.write(page[0]), () => loop(s))
    })
  }
  return new StreamImpl(core.suspend(() => loop(s)))
}

/** @internal */
export const paginateChunkEffect = <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, readonly [Chunk.Chunk<A>, Option.Option<S>]>
): Stream.Stream<R, E, A> => {
  const loop = (s: S): Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown> =>
    channel.unwrap(
      Effect.map(f(s), ([chunk, option]) =>
        Option.match(option, {
          onNone: () => channel.zipRight(core.write(chunk), core.unit),
          onSome: (s) => core.flatMap(core.write(chunk), () => loop(s))
        }))
    )
  return new StreamImpl(core.suspend(() => loop(s)))
}

/** @internal */
export const paginateEffect = <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, readonly [A, Option.Option<S>]>
): Stream.Stream<R, E, A> =>
  paginateChunkEffect(s, (s) => pipe(f(s), Effect.map(([a, s]) => [Chunk.of(a), s] as const)))

/** @internal */
export const peel = dual<
  <R2, E2, A, Z>(
    sink: Sink.Sink<R2, E2, A, A, Z>
  ) => <R, E>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, [Z, Stream.Stream<never, E, A>]>,
  <R, E, R2, E2, A, Z>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, A, Z>
  ) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, [Z, Stream.Stream<never, E, A>]>
>(2, <R, E, R2, E2, A, Z>(
  self: Stream.Stream<R, E, A>,
  sink: Sink.Sink<R2, E2, A, A, Z>
): Effect.Effect<R | R2 | Scope.Scope, E2 | E, [Z, Stream.Stream<never, E, A>]> => {
  type Signal = Emit | Halt | End
  const OP_EMIT = "Emit" as const
  type OP_EMIT = typeof OP_EMIT
  const OP_HALT = "Halt" as const
  type OP_HALT = typeof OP_HALT
  const OP_END = "End" as const
  type OP_END = typeof OP_END
  interface Emit {
    readonly _tag: OP_EMIT
    readonly elements: Chunk.Chunk<A>
  }
  interface Halt {
    readonly _tag: OP_HALT
    readonly cause: Cause.Cause<E>
  }
  interface End {
    readonly _tag: OP_END
  }
  return pipe(
    Deferred.make<E | E2, Z>(),
    Effect.flatMap((deferred) =>
      pipe(
        Handoff.make<Signal>(),
        Effect.map((handoff) => {
          const consumer = _sink.foldSink(_sink.collectLeftover(sink), {
            onFailure: (error) =>
              _sink.zipRight(
                _sink.fromEffect(Deferred.fail(deferred, error)),
                _sink.fail(error)
              ),
            onSuccess: ([z, leftovers]) => {
              const loop: Channel.Channel<
                never,
                E,
                Chunk.Chunk<A>,
                unknown,
                E | E2,
                Chunk.Chunk<A>,
                void
              > = core
                .readWithCause({
                  onInput: (elements) =>
                    core.flatMap(
                      core.fromEffect(
                        Handoff.offer<Signal>(handoff, { _tag: OP_EMIT, elements })
                      ),
                      () => loop
                    ),
                  onFailure: (cause) =>
                    channel.zipRight(
                      core.fromEffect(Handoff.offer<Signal>(handoff, { _tag: OP_HALT, cause })),
                      core.failCause(cause)
                    ),
                  onDone: (_) =>
                    channel.zipRight(
                      core.fromEffect(Handoff.offer<Signal>(handoff, { _tag: OP_END })),
                      core.unit
                    )
                })
              return _sink.fromChannel(
                pipe(
                  core.fromEffect(Deferred.succeed(deferred, z)),
                  channel.zipRight(core.fromEffect(
                    pipe(
                      handoff,
                      Handoff.offer<Signal>({ _tag: OP_EMIT, elements: leftovers })
                    )
                  )),
                  channel.zipRight(loop)
                )
              )
            }
          })

          const producer: Channel.Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A>, void> = pipe(
            Handoff.take(handoff),
            Effect.map((signal) => {
              switch (signal._tag) {
                case OP_EMIT: {
                  return pipe(core.write(signal.elements), core.flatMap(() => producer))
                }
                case OP_HALT: {
                  return core.failCause(signal.cause)
                }
                case OP_END: {
                  return core.unit
                }
              }
            }),
            channel.unwrap
          )

          return pipe(
            self,
            tapErrorCause((cause) => Deferred.failCause(deferred, cause)),
            run(consumer),
            Effect.forkScoped,
            Effect.zipRight(Deferred.await(deferred)),
            Effect.map((z) => [z, new StreamImpl(producer)] as [Z, StreamImpl<never, E, A>])
          )
        })
      )
    ),
    Effect.flatten
  )
})

/** @internal */
export const partition: {
  <C extends A, B extends A, A = C>(
    refinement: Refinement<A, B>,
    options?: {
      bufferSize?: number | undefined
    }
  ): <R, E>(
    self: Stream.Stream<R, E, C>
  ) => Effect.Effect<
    Scope.Scope | R,
    E,
    [excluded: Stream.Stream<never, E, Exclude<C, B>>, satisfying: Stream.Stream<never, E, B>]
  >
  <A>(
    predicate: Predicate<A>,
    options?: {
      bufferSize?: number | undefined
    }
  ): <R, E>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, E, [excluded: Stream.Stream<never, E, A>, satisfying: Stream.Stream<never, E, A>]>
  <R, E, C extends A, B extends A, A = C>(
    self: Stream.Stream<R, E, C>,
    refinement: Refinement<A, B>,
    options?: {
      bufferSize?: number | undefined
    }
  ): Effect.Effect<
    Scope.Scope | R,
    E,
    [excluded: Stream.Stream<never, E, Exclude<C, B>>, satisfying: Stream.Stream<never, E, B>]
  >
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    predicate: Predicate<A>,
    options?: {
      bufferSize?: number | undefined
    }
  ): Effect.Effect<Scope.Scope | R, E, [excluded: Stream.Stream<never, E, A>, satisfying: Stream.Stream<never, E, A>]>
} = dual(
  (args) => typeof args[1] === "function",
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    predicate: Predicate<A>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): Effect.Effect<
    R | Scope.Scope,
    E,
    [Stream.Stream<never, E, A>, Stream.Stream<never, E, A>]
  > =>
    partitionEither(
      self,
      (a) => Effect.succeed(predicate(a) ? Either.left(a) : Either.right(a)),
      options
    )
)

/** @internal */
export const partitionEither = dual<
  <A, R2, E2, A2, A3>(
    predicate: (a: A) => Effect.Effect<R2, E2, Either.Either<A2, A3>>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ) => <R, E>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<
    Scope.Scope | R2 | R,
    E2 | E,
    [left: Stream.Stream<never, E2 | E, A2>, right: Stream.Stream<never, E2 | E, A3>]
  >,
  <R, E, A, R2, E2, A2, A3>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: A) => Effect.Effect<R2, E2, Either.Either<A2, A3>>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ) => Effect.Effect<
    Scope.Scope | R2 | R,
    E2 | E,
    [left: Stream.Stream<never, E2 | E, A2>, right: Stream.Stream<never, E2 | E, A3>]
  >
>(
  (args) => typeof args[1] === "function",
  <R, E, A, R2, E2, A2, A3>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: A) => Effect.Effect<R2, E2, Either.Either<A2, A3>>,
    options?: {
      readonly bufferSize?: number | undefined
    }
  ): Effect.Effect<
    R | R2 | Scope.Scope,
    E | E2,
    [Stream.Stream<never, E | E2, A2>, Stream.Stream<never, E | E2, A3>]
  > =>
    pipe(
      mapEffectSequential(self, predicate),
      distributedWith({
        size: 2,
        maximumLag: options?.bufferSize ?? 16,
        decide: Either.match({
          onLeft: () => Effect.succeed((n) => n === 0),
          onRight: () => Effect.succeed((n) => n === 1)
        })
      }),
      Effect.flatMap(([queue1, queue2]) =>
        Effect.succeed([
          filterMap(
            flattenExitOption(fromQueue(queue1, { shutdown: true })),
            (_) =>
              Either.match(_, {
                onLeft: Option.some,
                onRight: Option.none
              })
          ),
          filterMap(
            flattenExitOption(fromQueue(queue2, { shutdown: true })),
            (_) =>
              Either.match(_, {
                onLeft: Option.none,
                onRight: Option.some
              })
          )
        ])
      )
    )
)

/** @internal */
export const pipeThrough = dual<
  <R2, E2, A, L, Z>(
    sink: Sink.Sink<R2, E2, A, L, Z>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, L>,
  <R, E, R2, E2, A, L, Z>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, L, Z>
  ) => Stream.Stream<R2 | R, E2 | E, L>
>(
  2,
  <R, E, R2, E2, A, L, Z>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, L, Z>
  ): Stream.Stream<R | R2, E | E2, L> =>
    new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(_sink.toChannel(sink))))
)

/** @internal */
export const pipeThroughChannel = dual<
  <R2, E, E2, A, A2>(
    channel: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ) => <R>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2, A2>,
  <R, R2, E, E2, A, A2>(
    self: Stream.Stream<R, E, A>,
    channel: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ) => Stream.Stream<R2 | R, E2, A2>
>(
  2,
  <R, R2, E, E2, A, A2>(
    self: Stream.Stream<R, E, A>,
    channel: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): Stream.Stream<R | R2, E2, A2> => new StreamImpl(pipe(toChannel(self), core.pipeTo(channel)))
)

/** @internal */
export const pipeThroughChannelOrFail = dual<
  <R2, E, E2, A, A2>(
    chan: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ) => <R>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E | E2, A2>,
  <R, R2, E, E2, A, A2>(
    self: Stream.Stream<R, E, A>,
    chan: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ) => Stream.Stream<R2 | R, E | E2, A2>
>(
  2,
  <R, R2, E, E2, A, A2>(
    self: Stream.Stream<R, E, A>,
    chan: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): Stream.Stream<R | R2, E | E2, A2> => new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(chan)))
)

/** @internal */
export const prepend = dual<
  <B>(values: Chunk.Chunk<B>) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A | B>,
  <R, E, A, B>(self: Stream.Stream<R, E, A>, values: Chunk.Chunk<B>) => Stream.Stream<R, E, A | B>
>(2, (self, values) =>
  new StreamImpl(
    channel.zipRight(
      core.write(values as Chunk.Chunk<any>),
      toChannel(self)
    )
  ))

/** @internal */
export const provideContext = dual<
  <R>(context: Context.Context<R>) => <E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<never, E, A>,
  <E, A, R>(self: Stream.Stream<R, E, A>, context: Context.Context<R>) => Stream.Stream<never, E, A>
>(
  2,
  <E, A, R>(self: Stream.Stream<R, E, A>, context: Context.Context<R>): Stream.Stream<never, E, A> =>
    new StreamImpl(pipe(toChannel(self), core.provideContext(context)))
)

/** @internal */
export const provideLayer = dual<
  <RIn, E2, ROut>(
    layer: Layer.Layer<RIn, E2, ROut>
  ) => <E, A>(self: Stream.Stream<ROut, E, A>) => Stream.Stream<RIn, E2 | E, A>,
  <E, A, RIn, E2, ROut>(
    self: Stream.Stream<ROut, E, A>,
    layer: Layer.Layer<RIn, E2, ROut>
  ) => Stream.Stream<RIn, E2 | E, A>
>(
  2,
  <E, A, RIn, E2, ROut>(
    self: Stream.Stream<ROut, E, A>,
    layer: Layer.Layer<RIn, E2, ROut>
  ): Stream.Stream<RIn, E | E2, A> =>
    new StreamImpl(
      channel.unwrapScoped(pipe(
        Layer.build(layer),
        Effect.map((env) => pipe(toChannel(self), core.provideContext(env)))
      ))
    )
)

/** @internal */
export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    resource: Context.Tag.Service<T>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<Exclude<R, Context.Tag.Identifier<T>>, E, A>,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Stream.Stream<R, E, A>,
    tag: T,
    resource: Context.Tag.Service<T>
  ) => Stream.Stream<Exclude<R, Context.Tag.Identifier<T>>, E, A>
>(
  3,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Stream.Stream<R, E, A>,
    tag: T,
    resource: Context.Tag.Service<T>
  ) => provideServiceEffect(self, tag, Effect.succeed(resource))
)

/** @internal */
export const provideServiceEffect = dual<
  <T extends Context.Tag<any, any>, R2, E2>(
    tag: T,
    effect: Effect.Effect<R2, E2, Context.Tag.Service<T>>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A>,
  <R, E, A, T extends Context.Tag<any, any>, R2, E2>(
    self: Stream.Stream<R, E, A>,
    tag: T,
    effect: Effect.Effect<R2, E2, Context.Tag.Service<T>>
  ) => Stream.Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A>
>(
  3,
  <R, E, A, T extends Context.Tag<any, any>, R2, E2>(
    self: Stream.Stream<R, E, A>,
    tag: T,
    effect: Effect.Effect<R2, E2, Context.Tag.Service<T>>
  ) => provideServiceStream(self, tag, fromEffect(effect))
)

/** @internal */
export const provideServiceStream = dual<
  <T extends Context.Tag<any, any>, R2, E2>(
    tag: T,
    stream: Stream.Stream<R2, E2, Context.Tag.Service<T>>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A>,
  <R, E, A, T extends Context.Tag<any, any>, R2, E2>(
    self: Stream.Stream<R, E, A>,
    tag: T,
    stream: Stream.Stream<R2, E2, Context.Tag.Service<T>>
  ) => Stream.Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A>
>(
  3,
  <R, E, A, T extends Context.Tag<any, any>, R2, E2>(
    self: Stream.Stream<R, E, A>,
    tag: T,
    stream: Stream.Stream<R2, E2, Context.Tag.Service<T>>
  ): Stream.Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A> =>
    contextWithStream((env: Context.Context<R2 | Exclude<R, Context.Tag.Identifier<T>>>) =>
      flatMap(
        stream,
        (service) => pipe(self, provideContext(Context.add(env, tag, service) as Context.Context<R | R2>))
      )
    )
)

/** @internal */
export const mapInputContext = dual<
  <R0, R>(
    f: (env: Context.Context<R0>) => Context.Context<R>
  ) => <E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R0, E, A>,
  <E, A, R0, R>(
    self: Stream.Stream<R, E, A>,
    f: (env: Context.Context<R0>) => Context.Context<R>
  ) => Stream.Stream<R0, E, A>
>(
  2,
  <E, A, R0, R>(
    self: Stream.Stream<R, E, A>,
    f: (env: Context.Context<R0>) => Context.Context<R>
  ): Stream.Stream<R0, E, A> => contextWithStream((env) => pipe(self, provideContext(f(env))))
)

/** @internal */
export const provideSomeLayer = dual<
  <RIn, E2, ROut>(
    layer: Layer.Layer<RIn, E2, ROut>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<RIn | Exclude<R, ROut>, E2 | E, A>,
  <R, E, A, RIn, E2, ROut>(
    self: Stream.Stream<R, E, A>,
    layer: Layer.Layer<RIn, E2, ROut>
  ) => Stream.Stream<RIn | Exclude<R, ROut>, E2 | E, A>
>(
  2,
  <R, E, A, RIn, E2, ROut>(
    self: Stream.Stream<R, E, A>,
    layer: Layer.Layer<RIn, E2, ROut>
  ): Stream.Stream<RIn | Exclude<R, ROut>, E | E2, A> =>
    // @ts-expect-error
    pipe(
      self,
      provideLayer(pipe(Layer.context(), Layer.merge(layer)))
    )
)

/** @internal */
export const range = (min: number, max: number, chunkSize = DefaultChunkSize): Stream.Stream<never, never, number> =>
  suspend(() => {
    if (min > max) {
      return empty as Stream.Stream<never, never, number>
    }
    const go = (
      min: number,
      max: number,
      chunkSize: number
    ): Channel.Channel<never, unknown, unknown, unknown, never, Chunk.Chunk<number>, unknown> => {
      const remaining = max - min + 1
      if (remaining > chunkSize) {
        return pipe(
          core.write(Chunk.range(min, min + chunkSize - 1)),
          core.flatMap(() => go(min + chunkSize, max, chunkSize))
        )
      }
      return core.write(Chunk.range(min, min + remaining - 1))
    }
    return new StreamImpl(go(min, max, chunkSize))
  })

/** @internal */
export const rechunk = dual<
  (n: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, n: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, n: number): Stream.Stream<R, E, A> =>
  suspend(() => {
    const target = Math.max(n, 1)
    const process = rechunkProcess<E, A>(new StreamRechunker(target), target)
    return new StreamImpl(pipe(toChannel(self), core.pipeTo(process)))
  }))

/** @internal */
const rechunkProcess = <E, A>(
  rechunker: StreamRechunker<E, A>,
  target: number
): Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> =>
  core.readWithCause({
    onInput: (chunk: Chunk.Chunk<A>) => {
      if (chunk.length === target && rechunker.isEmpty()) {
        return core.flatMap(
          core.write(chunk),
          () => rechunkProcess(rechunker, target)
        )
      }
      if (chunk.length > 0) {
        const chunks: Array<Chunk.Chunk<A>> = []
        let result: Chunk.Chunk<A> | undefined = undefined
        let index = 0
        while (index < chunk.length) {
          while (index < chunk.length && result === undefined) {
            result = rechunker.write(pipe(chunk, Chunk.unsafeGet(index)))
            index = index + 1
          }
          if (result !== undefined) {
            chunks.push(result)
            result = undefined
          }
        }
        return core.flatMap(
          channel.writeAll(...chunks),
          () => rechunkProcess(rechunker, target)
        )
      }
      return core.suspend(() => rechunkProcess(rechunker, target))
    },
    onFailure: (cause) => channel.zipRight(rechunker.emitIfNotEmpty(), core.failCause(cause)),
    onDone: () => rechunker.emitIfNotEmpty()
  })

/** @internal */
class StreamRechunker<in out E, out A> {
  private builder: Array<A> = []
  private pos = 0

  constructor(readonly n: number) {
  }

  isEmpty(): boolean {
    return this.pos === 0
  }

  write(elem: A): Chunk.Chunk<A> | undefined {
    this.builder.push(elem)
    this.pos += 1

    if (this.pos === this.n) {
      const result = Chunk.unsafeFromArray(this.builder)
      this.builder = []
      this.pos = 0
      return result
    }

    return undefined
  }

  emitIfNotEmpty(): Channel.Channel<never, E, unknown, unknown, E, Chunk.Chunk<A>, void> {
    if (this.pos !== 0) {
      return core.write(Chunk.unsafeFromArray(this.builder))
    }
    return core.unit
  }
}

/** @internal */
export const refineOrDie = dual<
  <E, E2>(pf: (error: E) => Option.Option<E2>) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2, A>,
  <R, A, E, E2>(self: Stream.Stream<R, E, A>, pf: (error: E) => Option.Option<E2>) => Stream.Stream<R, E2, A>
>(
  2,
  <R, A, E, E2>(self: Stream.Stream<R, E, A>, pf: (error: E) => Option.Option<E2>): Stream.Stream<R, E2, A> =>
    pipe(self, refineOrDieWith(pf, identity))
)

/** @internal */
export const refineOrDieWith = dual<
  <E, E2>(
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2, A>,
  <R, A, E, E2>(
    self: Stream.Stream<R, E, A>,
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => Stream.Stream<R, E2, A>
>(
  3,
  <R, A, E, E2>(
    self: Stream.Stream<R, E, A>,
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ): Stream.Stream<R, E2, A> =>
    new StreamImpl(
      channel.catchAll(toChannel(self), (error) =>
        Option.match(pf(error), {
          onNone: () => core.failCause(Cause.die(f(error))),
          onSome: core.fail
        }))
    )
)

/** @internal */
export const repeat = dual<
  <R2, B>(
    schedule: Schedule.Schedule<R2, unknown, B>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, A>,
  <R, E, A, R2, B>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>
  ) => Stream.Stream<R2 | R, E, A>
>(
  2,
  <R, E, A, R2, B>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>
  ): Stream.Stream<R | R2, E, A> =>
    filterMap(
      repeatEither(self, schedule),
      (_) =>
        Either.match(_, {
          onLeft: Option.none,
          onRight: Option.some
        })
    )
)

/** @internal */
export const repeatEffect = <R, E, A>(effect: Effect.Effect<R, E, A>): Stream.Stream<R, E, A> =>
  repeatEffectOption(pipe(effect, Effect.mapError(Option.some)))

/** @internal */
export const repeatEffectChunk = <R, E, A>(effect: Effect.Effect<R, E, Chunk.Chunk<A>>): Stream.Stream<R, E, A> =>
  repeatEffectChunkOption(pipe(effect, Effect.mapError(Option.some)))

/** @internal */
export const repeatEffectChunkOption = <R, E, A>(
  effect: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>
): Stream.Stream<R, E, A> =>
  unfoldChunkEffect(effect, (effect) =>
    pipe(
      Effect.map(effect, (chunk) => Option.some([chunk, effect] as const)),
      Effect.catchAll(Option.match({
        onNone: () => Effect.succeed(Option.none()),
        onSome: Effect.fail
      }))
    ))

/** @internal */
export const repeatEffectOption = <R, E, A>(effect: Effect.Effect<R, Option.Option<E>, A>): Stream.Stream<R, E, A> =>
  repeatEffectChunkOption(pipe(effect, Effect.map(Chunk.of)))

/** @internal */
export const repeatEither = dual<
  <R2, B>(
    schedule: Schedule.Schedule<R2, unknown, B>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, Either.Either<B, A>>,
  <R, E, A, R2, B>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>
  ) => Stream.Stream<R2 | R, E, Either.Either<B, A>>
>(
  2,
  <R, E, A, R2, B>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>
  ): Stream.Stream<R | R2, E, Either.Either<B, A>> =>
    repeatWith(self, schedule, {
      onElement: (a): Either.Either<B, A> => Either.right(a),
      onSchedule: Either.left
    })
)

/** @internal */
export const repeatElements = dual<
  <R2, B>(
    schedule: Schedule.Schedule<R2, unknown, B>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, A>,
  <R, E, A, R2, B>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>
  ) => Stream.Stream<R2 | R, E, A>
>(
  2,
  <R, E, A, R2, B>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>
  ): Stream.Stream<R | R2, E, A> =>
    filterMap(
      repeatElementsWith(self, schedule, { onElement: (a) => Option.some(a), onSchedule: Option.none }),
      identity
    )
)

/** @internal */
export const repeatElementsWith = dual<
  <R2, B, A, C>(
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, C>,
  <R, E, R2, B, A, C>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ) => Stream.Stream<R2 | R, E, C>
>(
  3,
  <R, E, R2, B, A, C>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): Stream.Stream<R | R2, E, C> => {
    const driver = pipe(
      Schedule.driver(schedule),
      Effect.map((driver) => {
        const feed = (
          input: Chunk.Chunk<A>
        ): Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C>, void> =>
          Option.match(Chunk.head(input), {
            onNone: () => loop,
            onSome: (a) =>
              channel.zipRight(
                core.write(Chunk.of(options.onElement(a))),
                step(pipe(input, Chunk.drop(1)), a)
              )
          })
        const step = (
          input: Chunk.Chunk<A>,
          a: A
        ): Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C>, void> => {
          const advance = pipe(
            driver.next(a),
            Effect.as(pipe(core.write(Chunk.of(options.onElement(a))), core.flatMap(() => step(input, a))))
          )
          const reset: Effect.Effect<
            R2,
            never,
            Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C>, void>
          > = pipe(
            driver.last,
            Effect.orDie,
            Effect.flatMap((b) =>
              pipe(
                driver.reset,
                Effect.map(() =>
                  pipe(
                    core.write(Chunk.of(options.onSchedule(b))),
                    channel.zipRight(feed(input))
                  )
                )
              )
            )
          )
          return pipe(advance, Effect.orElse(() => reset), channel.unwrap)
        }
        const loop: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C>, void> = core.readWith({
          onInput: feed,
          onFailure: core.fail,
          onDone: () => core.unit
        })
        return loop
      }),
      channel.unwrap
    )
    return new StreamImpl(pipe(toChannel(self), core.pipeTo(driver)))
  }
)

/** @internal */
export const repeatValue = <A>(value: A): Stream.Stream<never, never, A> =>
  new StreamImpl(
    channel.repeated(core.write(Chunk.of(value)))
  )

/** @internal */
export const repeatWith = dual<
  <R2, B, A, C>(
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, C>,
  <R, E, R2, B, A, C>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ) => Stream.Stream<R2 | R, E, C>
>(
  3,
  <R, E, R2, B, A, C>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): Stream.Stream<R | R2, E, C> => {
    return pipe(
      Schedule.driver(schedule),
      Effect.map((driver) => {
        const scheduleOutput = pipe(driver.last, Effect.orDie, Effect.map(options.onSchedule))
        const process = pipe(self, map(options.onElement), toChannel)
        const loop: Channel.Channel<R | R2, unknown, unknown, unknown, E, Chunk.Chunk<C>, void> = channel.unwrap(
          Effect.match(driver.next(void 0), {
            onFailure: () => core.unit,
            onSuccess: () =>
              pipe(
                process,
                channel.zipRight(
                  pipe(
                    scheduleOutput,
                    Effect.map((c) => pipe(core.write(Chunk.of(c)), core.flatMap(() => loop))),
                    channel.unwrap
                  )
                )
              )
          })
        )
        return new StreamImpl(pipe(process, channel.zipRight(loop)))
      }),
      unwrap
    )
  }
)

/** @internal */
export const repeatWithSchedule = <R, A, _>(
  value: A,
  schedule: Schedule.Schedule<R, A, _>
): Stream.Stream<R, never, A> => repeatEffectWithSchedule(Effect.succeed(value), schedule)

/** @internal */
export const repeatEffectWithSchedule = <R, E, A, A0 extends A, R2, _>(
  effect: Effect.Effect<R, E, A>,
  schedule: Schedule.Schedule<R2, A0, _>
): Stream.Stream<R | R2, E, A> =>
  flatMap(
    fromEffect(Effect.zip(effect, Schedule.driver(schedule))),
    ([a, driver]) =>
      concat(
        succeed(a),
        unfoldEffect(a, (s) =>
          Effect.matchEffect(driver.next(s as A0), {
            onFailure: Effect.succeed,
            onSuccess: () => Effect.map(effect, (nextA) => Option.some([nextA, nextA] as const))
          }))
      )
  )

/** @internal */
export const retry = dual<
  <R2, E, E0 extends E, _>(
    schedule: Schedule.Schedule<R2, E0, _>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, A>,
  <R, A, R2, E, E0 extends E, _>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, E0, _>
  ) => Stream.Stream<R2 | R, E, A>
>(
  2,
  <R, A, R2, E, E0 extends E, _>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, E0, _>
  ): Stream.Stream<R | R2, E, A> =>
    unwrap(
      Effect.map(Schedule.driver(schedule), (driver) => {
        const loop: Stream.Stream<R | R2, E, A> = catchAll(self, (error) =>
          unwrap(
            Effect.matchEffect(driver.next(error as E0), {
              onFailure: () => Effect.fail(error),
              onSuccess: () => Effect.succeed(pipe(loop, tap(() => driver.reset)))
            })
          ))
        return loop
      })
    )
)

/** @internal */
export const run = dual<
  <R2, E2, A, Z>(
    sink: Sink.Sink<R2, E2, A, unknown, Z>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, Z>,
  <R, E, R2, E2, A, Z>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, unknown, Z>
  ) => Effect.Effect<R2 | R, E2 | E, Z>
>(2, <R, E, R2, E2, A, Z>(
  self: Stream.Stream<R, E, A>,
  sink: Sink.Sink<R2, E2, A, unknown, Z>
): Effect.Effect<R | R2, E | E2, Z> =>
  pipe(toChannel(self), channel.pipeToOrFail(_sink.toChannel(sink)), channel.runDrain))

/** @internal */
export const runCollect = <R, E, A>(self: Stream.Stream<R, E, A>): Effect.Effect<R, E, Chunk.Chunk<A>> =>
  pipe(self, run(_sink.collectAll()))

/** @internal */
export const runCount = <R, E, A>(self: Stream.Stream<R, E, A>): Effect.Effect<R, E, number> =>
  pipe(self, run(_sink.count))

/** @internal */
export const runDrain = <R, E, A>(self: Stream.Stream<R, E, A>): Effect.Effect<R, E, void> =>
  pipe(self, run(_sink.drain))

/** @internal */
export const runFold = dual<
  <S, A>(s: S, f: (s: S, a: A) => S) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R, E, S>,
  <R, E, S, A>(self: Stream.Stream<R, E, A>, s: S, f: (s: S, a: A) => S) => Effect.Effect<R, E, S>
>(
  3,
  <R, E, S, A>(self: Stream.Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Effect.Effect<R, E, S> =>
    pipe(self, runFoldWhileScoped(s, constTrue, f), Effect.scoped)
)

/** @internal */
export const runFoldEffect = dual<
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, S>,
  <R, E, S, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => Effect.Effect<R2 | R, E2 | E, S>
>(3, <R, E, S, A, R2, E2>(
  self: Stream.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => Effect.Effect<R2, E2, S>
): Effect.Effect<R | R2, E | E2, S> => pipe(self, runFoldWhileScopedEffect(s, constTrue, f), Effect.scoped))

/** @internal */
export const runFoldScoped = dual<
  <S, A>(s: S, f: (s: S, a: A) => S) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, E, S>,
  <R, E, S, A>(self: Stream.Stream<R, E, A>, s: S, f: (s: S, a: A) => S) => Effect.Effect<Scope.Scope | R, E, S>
>(
  3,
  <R, E, S, A>(self: Stream.Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Effect.Effect<R | Scope.Scope, E, S> =>
    pipe(self, runFoldWhileScoped(s, constTrue, f))
)

/** @internal */
export const runFoldScopedEffect = dual<
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, S>,
  <R, E, S, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, S>
>(3, <R, E, S, A, R2, E2>(
  self: Stream.Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => Effect.Effect<R2, E2, S>
): Effect.Effect<R | R2 | Scope.Scope, E | E2, S> => pipe(self, runFoldWhileScopedEffect(s, constTrue, f)))

/** @internal */
export const runFoldWhile = dual<
  <S, A>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => S
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R, E, S>,
  <R, E, S, A>(self: Stream.Stream<R, E, A>, s: S, cont: Predicate<S>, f: (s: S, a: A) => S) => Effect.Effect<R, E, S>
>(4, <R, E, S, A>(
  self: Stream.Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => S
): Effect.Effect<R, E, S> => pipe(self, runFoldWhileScoped(s, cont, f), Effect.scoped))

/** @internal */
export const runFoldWhileEffect = dual<
  <S, A, R2, E2>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, S>,
  <R, E, S, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => Effect.Effect<R2 | R, E2 | E, S>
>(4, <R, E, S, A, R2, E2>(
  self: Stream.Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => Effect.Effect<R2, E2, S>
): Effect.Effect<R | R2, E | E2, S> => pipe(self, runFoldWhileScopedEffect(s, cont, f), Effect.scoped))

/** @internal */
export const runFoldWhileScoped = dual<
  <S, A>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => S
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, E, S>,
  <R, E, S, A>(
    self: Stream.Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => S
  ) => Effect.Effect<Scope.Scope | R, E, S>
>(4, <R, E, S, A>(
  self: Stream.Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => S
): Effect.Effect<R | Scope.Scope, E, S> => pipe(self, runScoped(_sink.fold(s, cont, f))))

/** @internal */
export const runFoldWhileScopedEffect = dual<
  <S, A, R2, E2>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, S>,
  <R, E, S, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, S>
>(4, <R, E, S, A, R2, E2>(
  self: Stream.Stream<R, E, A>,
  s: S,
  cont: Predicate<S>,
  f: (s: S, a: A) => Effect.Effect<R2, E2, S>
): Effect.Effect<R | R2 | Scope.Scope, E | E2, S> => pipe(self, runScoped(_sink.foldEffect(s, cont, f))))

/** @internal */
export const runForEach = dual<
  <A, R2, E2, _>(
    f: (a: A) => Effect.Effect<R2, E2, _>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ) => Effect.Effect<R2 | R, E2 | E, void>
>(2, <R, E, A, R2, E2, _>(
  self: Stream.Stream<R, E, A>,
  f: (a: A) => Effect.Effect<R2, E2, _>
): Effect.Effect<R | R2, E | E2, void> => pipe(self, run(_sink.forEach(f))))

/** @internal */
export const runForEachChunk = dual<
  <A, R2, E2, _>(
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ) => Effect.Effect<R2 | R, E2 | E, void>
>(2, <R, E, A, R2, E2, _>(
  self: Stream.Stream<R, E, A>,
  f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
): Effect.Effect<R | R2, E | E2, void> => pipe(self, run(_sink.forEachChunk(f))))

/** @internal */
export const runForEachChunkScoped = dual<
  <A, R2, E2, _>(
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, void>,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, void>
>(2, <R, E, A, R2, E2, _>(
  self: Stream.Stream<R, E, A>,
  f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
): Effect.Effect<R | R2 | Scope.Scope, E | E2, void> => pipe(self, runScoped(_sink.forEachChunk(f))))

/** @internal */
export const runForEachScoped = dual<
  <A, R2, E2, _>(
    f: (a: A) => Effect.Effect<R2, E2, _>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R2 | R | Scope.Scope, E2 | E, void>,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ) => Effect.Effect<R2 | R | Scope.Scope, E2 | E, void>
>(2, <R, E, A, R2, E2, _>(
  self: Stream.Stream<R, E, A>,
  f: (a: A) => Effect.Effect<R2, E2, _>
): Effect.Effect<R | R2 | Scope.Scope, E | E2, void> => pipe(self, runScoped(_sink.forEach(f))))

/** @internal */
export const runForEachWhile = dual<
  <A, R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ) => Effect.Effect<R2 | R, E2 | E, void>
>(2, <R, E, A, R2, E2>(
  self: Stream.Stream<R, E, A>,
  f: (a: A) => Effect.Effect<R2, E2, boolean>
): Effect.Effect<R | R2, E | E2, void> => pipe(self, run(_sink.forEachWhile(f))))

/** @internal */
export const runForEachWhileScoped = dual<
  <A, R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<R2 | R | Scope.Scope, E2 | E, void>,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ) => Effect.Effect<R2 | R | Scope.Scope, E2 | E, void>
>(2, <R, E, A, R2, E2>(
  self: Stream.Stream<R, E, A>,
  f: (a: A) => Effect.Effect<R2, E2, boolean>
): Effect.Effect<R | R2 | Scope.Scope, E | E2, void> => pipe(self, runScoped(_sink.forEachWhile(f))))

/** @internal */
export const runHead = <R, E, A>(self: Stream.Stream<R, E, A>): Effect.Effect<R, E, Option.Option<A>> =>
  pipe(self, run(_sink.head<A>()))

/** @internal */
export const runIntoPubSub = dual<
  <E, A>(pubsub: PubSub.PubSub<Take.Take<E, A>>) => <R>(self: Stream.Stream<R, E, A>) => Effect.Effect<R, never, void>,
  <R, E, A>(self: Stream.Stream<R, E, A>, pubsub: PubSub.PubSub<Take.Take<E, A>>) => Effect.Effect<R, never, void>
>(
  2,
  <R, E, A>(self: Stream.Stream<R, E, A>, pubsub: PubSub.PubSub<Take.Take<E, A>>): Effect.Effect<R, never, void> =>
    pipe(self, runIntoQueue(pubsub))
)

/** @internal */
export const runIntoPubSubScoped = dual<
  <E, A>(
    pubsub: PubSub.PubSub<Take.Take<E, A>>
  ) => <R>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, void>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    pubsub: PubSub.PubSub<Take.Take<E, A>>
  ) => Effect.Effect<Scope.Scope | R, never, void>
>(2, <R, E, A>(
  self: Stream.Stream<R, E, A>,
  pubsub: PubSub.PubSub<Take.Take<E, A>>
): Effect.Effect<R | Scope.Scope, never, void> => pipe(self, runIntoQueueScoped(pubsub)))

/** @internal */
export const runIntoQueue = dual<
  <E, A>(queue: Queue.Enqueue<Take.Take<E, A>>) => <R>(self: Stream.Stream<R, E, A>) => Effect.Effect<R, never, void>,
  <R, E, A>(self: Stream.Stream<R, E, A>, queue: Queue.Enqueue<Take.Take<E, A>>) => Effect.Effect<R, never, void>
>(
  2,
  <R, E, A>(self: Stream.Stream<R, E, A>, queue: Queue.Enqueue<Take.Take<E, A>>): Effect.Effect<R, never, void> =>
    pipe(self, runIntoQueueScoped(queue), Effect.scoped)
)

/** @internal */
export const runIntoQueueElementsScoped = dual<
  <E, A>(
    queue: Queue.Enqueue<Exit.Exit<Option.Option<E>, A>>
  ) => <R>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, void>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    queue: Queue.Enqueue<Exit.Exit<Option.Option<E>, A>>
  ) => Effect.Effect<Scope.Scope | R, never, void>
>(2, <R, E, A>(
  self: Stream.Stream<R, E, A>,
  queue: Queue.Enqueue<Exit.Exit<Option.Option<E>, A>>
): Effect.Effect<R | Scope.Scope, never, void> => {
  const writer: Channel.Channel<R, E, Chunk.Chunk<A>, unknown, never, Exit.Exit<Option.Option<E>, A>, unknown> = core
    .readWithCause({
      onInput: (input: Chunk.Chunk<A>) =>
        core.flatMap(
          core.fromEffect(Queue.offerAll(queue, Chunk.map(input, Exit.succeed))),
          () => writer
        ),
      onFailure: (cause) => core.fromEffect(Queue.offer(queue, Exit.failCause(Cause.map(cause, Option.some)))),
      onDone: () => core.fromEffect(Queue.offer(queue, Exit.fail(Option.none())))
    })
  return pipe(
    core.pipeTo(toChannel(self), writer),
    channel.drain,
    channelExecutor.runScoped,
    Effect.asUnit
  )
})

/** @internal */
export const runIntoQueueScoped = dual<
  <E, A>(
    queue: Queue.Enqueue<Take.Take<E, A>>
  ) => <R>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, void>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    queue: Queue.Enqueue<Take.Take<E, A>>
  ) => Effect.Effect<Scope.Scope | R, never, void>
>(2, <R, E, A>(
  self: Stream.Stream<R, E, A>,
  queue: Queue.Enqueue<Take.Take<E, A>>
): Effect.Effect<R | Scope.Scope, never, void> => {
  const writer: Channel.Channel<R, E, Chunk.Chunk<A>, unknown, never, Take.Take<E, A>, unknown> = core
    .readWithCause({
      onInput: (input: Chunk.Chunk<A>) => core.flatMap(core.write(_take.chunk(input)), () => writer),
      onFailure: (cause) => core.write(_take.failCause(cause)),
      onDone: () => core.write(_take.end)
    })
  return pipe(
    core.pipeTo(toChannel(self), writer),
    channel.mapOutEffect((take) => Queue.offer(queue, take)),
    channel.drain,
    channelExecutor.runScoped,
    Effect.asUnit
  )
})

/** @internal */
export const runLast = <R, E, A>(self: Stream.Stream<R, E, A>): Effect.Effect<R, E, Option.Option<A>> =>
  pipe(self, run(_sink.last()))

/** @internal */
export const runScoped = dual<
  <R2, E2, A, A2>(
    sink: Sink.Sink<R2, E2, A, unknown, A2>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, A2>,
  <R, E, R2, E2, A, A2>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, unknown, A2>
  ) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, A2>
>(2, <R, E, R2, E2, A, A2>(
  self: Stream.Stream<R, E, A>,
  sink: Sink.Sink<R2, E2, A, unknown, A2>
): Effect.Effect<R | R2 | Scope.Scope, E | E2, A2> =>
  pipe(
    toChannel(self),
    channel.pipeToOrFail(_sink.toChannel(sink)),
    channel.drain,
    channelExecutor.runScoped
  ))

/** @internal */
export const runSum = <R, E>(self: Stream.Stream<R, E, number>): Effect.Effect<R, E, number> =>
  pipe(self, run(_sink.sum))

/** @internal */
export const scan = dual<
  <S, A>(s: S, f: (s: S, a: A) => S) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, S>,
  <R, E, S, A>(self: Stream.Stream<R, E, A>, s: S, f: (s: S, a: A) => S) => Stream.Stream<R, E, S>
>(
  3,
  <R, E, S, A>(self: Stream.Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Stream.Stream<R, E, S> =>
    pipe(self, scanEffect(s, (s, a) => Effect.succeed(f(s, a))))
)

/** @internal */
export const scanReduce = dual<
  <A2, A>(f: (a2: A2 | A, a: A) => A2) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A2 | A>,
  <R, E, A2, A>(self: Stream.Stream<R, E, A>, f: (a2: A2 | A, a: A) => A2) => Stream.Stream<R, E, A2 | A>
>(
  2,
  <R, E, A2, A>(self: Stream.Stream<R, E, A>, f: (a2: A | A2, a: A) => A2): Stream.Stream<R, E, A | A2> =>
    pipe(self, scanReduceEffect((a2, a) => Effect.succeed(f(a2, a))))
)

/** @internal */
export const scanReduceEffect = dual<
  <A2, A, R2, E2>(
    f: (a2: A2 | A, a: A) => Effect.Effect<R2, E2, A2 | A>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2 | A>,
  <R, E, A2, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    f: (a2: A2 | A, a: A) => Effect.Effect<R2, E2, A2 | A>
  ) => Stream.Stream<R2 | R, E2 | E, A2 | A>
>(
  2,
  <R, E, A2, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    f: (a2: A | A2, a: A) => Effect.Effect<R2, E2, A | A2>
  ): Stream.Stream<R | R2, E | E2, A | A2> =>
    pipe(
      self,
      mapAccumEffect<Option.Option<A | A2>, A, R2, E2, A | A2>(Option.none() as Option.Option<A | A2>, (option, a) => {
        switch (option._tag) {
          case "None": {
            return Effect.succeed([Option.some<A | A2>(a), a] as const)
          }
          case "Some": {
            return pipe(
              f(option.value, a),
              Effect.map((b) => [Option.some<A | A2>(b), b] as const)
            )
          }
        }
      })
    )
)

/** @internal */
export const schedule = dual<
  <R2, A, A0 extends A, _>(
    schedule: Schedule.Schedule<R2, A0, _>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, A>,
  <R, E, R2, A, A0 extends A, _>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, _>
  ) => Stream.Stream<R2 | R, E, A>
>(
  2,
  <R, E, R2, A, A0 extends A, _>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, _>
  ): Stream.Stream<R | R2, E, A> =>
    filterMap(
      scheduleWith(self, schedule, { onElement: Option.some, onSchedule: Option.none }),
      identity
    )
)

/** @internal */
export const scheduleWith = dual<
  <R2, A, A0 extends A, B, C>(
    schedule: Schedule.Schedule<R2, A0, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E, C>,
  <R, E, R2, A, A0 extends A, B, C>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ) => Stream.Stream<R2 | R, E, C>
>(
  3,
  <R, E, R2, A, A0 extends A, B, C>(
    self: Stream.Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, B>,
    options: {
      readonly onElement: (a: A) => C
      readonly onSchedule: (b: B) => C
    }
  ): Stream.Stream<R | R2, E, C> => {
    const loop = (
      driver: Schedule.ScheduleDriver<R2, A0, B>,
      iterator: Iterator<A>
    ): Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<C>, unknown> => {
      const next = iterator.next()
      if (next.done) {
        return core.readWithCause({
          onInput: (chunk: Chunk.Chunk<A>) => loop(driver, chunk[Symbol.iterator]()),
          onFailure: core.failCause,
          onDone: core.succeedNow
        })
      }
      return channel.unwrap(
        Effect.matchEffect(driver.next(next.value as A0), {
          onFailure: () =>
            pipe(
              driver.last,
              Effect.orDie,
              Effect.map((b) =>
                pipe(
                  core.write(Chunk.make(options.onElement(next.value), options.onSchedule(b))),
                  core.flatMap(() => loop(driver, iterator))
                )
              ),
              Effect.zipLeft(driver.reset)
            ),
          onSuccess: () =>
            Effect.succeed(pipe(
              core.write(Chunk.of(options.onElement(next.value))),
              core.flatMap(() => loop(driver, iterator))
            ))
        })
      )
    }
    return new StreamImpl(
      pipe(
        core.fromEffect(Schedule.driver(schedule)),
        core.flatMap((driver) =>
          pipe(
            toChannel(self),
            core.pipeTo(loop(driver, Chunk.empty<A>()[Symbol.iterator]()))
          )
        )
      )
    )
  }
)

/** @internal */
export const scanEffect = dual<
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, S>,
  <R, E, S, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ) => Stream.Stream<R2 | R, E2 | E, S>
>(
  3,
  <R, E, S, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Stream.Stream<R | R2, E | E2, S> =>
    new StreamImpl(
      pipe(
        core.write(Chunk.of(s)),
        core.flatMap(() =>
          toChannel(pipe(
            self,
            mapAccumEffect(s, (s, a) => pipe(f(s, a), Effect.map((s) => [s, s])))
          ))
        )
      )
    )
)

/** @internal */
export const scoped = <R, E, A>(
  effect: Effect.Effect<R, E, A>
): Stream.Stream<Exclude<R, Scope.Scope>, E, A> =>
  new StreamImpl(channel.ensuring(channel.scoped(pipe(effect, Effect.map(Chunk.of))), Effect.unit))

/** @internal */
export const some = <R, E, A>(self: Stream.Stream<R, E, Option.Option<A>>): Stream.Stream<R, Option.Option<E>, A> =>
  pipe(self, mapError(Option.some), someOrFail(() => Option.none()))

/** @internal */
export const someOrElse = dual<
  <A2>(fallback: LazyArg<A2>) => <R, E, A>(self: Stream.Stream<R, E, Option.Option<A>>) => Stream.Stream<R, E, A2 | A>,
  <R, E, A, A2>(self: Stream.Stream<R, E, Option.Option<A>>, fallback: LazyArg<A2>) => Stream.Stream<R, E, A2 | A>
>(
  2,
  <R, E, A, A2>(self: Stream.Stream<R, E, Option.Option<A>>, fallback: LazyArg<A2>): Stream.Stream<R, E, A | A2> =>
    pipe(self, map(Option.getOrElse(fallback)))
)

/** @internal */
export const someOrFail = dual<
  <E2>(error: LazyArg<E2>) => <R, E, A>(self: Stream.Stream<R, E, Option.Option<A>>) => Stream.Stream<R, E2 | E, A>,
  <R, E, A, E2>(self: Stream.Stream<R, E, Option.Option<A>>, error: LazyArg<E2>) => Stream.Stream<R, E2 | E, A>
>(
  2,
  <R, E, A, E2>(self: Stream.Stream<R, E, Option.Option<A>>, error: LazyArg<E2>): Stream.Stream<R, E | E2, A> =>
    mapEffectSequential(
      self,
      Option.match({
        onNone: () => Effect.failSync(error),
        onSome: Effect.succeed
      })
    )
)

/** @internal */
export const sliding = dual<
  (
    chunkSize: number
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, Chunk.Chunk<A>>,
  <R, E, A>(self: Stream.Stream<R, E, A>, chunkSize: number) => Stream.Stream<R, E, Chunk.Chunk<A>>
>(
  2,
  <R, E, A>(self: Stream.Stream<R, E, A>, chunkSize: number): Stream.Stream<R, E, Chunk.Chunk<A>> =>
    slidingSize(self, chunkSize, 1)
)

/** @internal */
export const slidingSize = dual<
  (
    chunkSize: number,
    stepSize: number
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, Chunk.Chunk<A>>,
  <R, E, A>(self: Stream.Stream<R, E, A>, chunkSize: number, stepSize: number) => Stream.Stream<R, E, Chunk.Chunk<A>>
>(
  3,
  <R, E, A>(self: Stream.Stream<R, E, A>, chunkSize: number, stepSize: number): Stream.Stream<R, E, Chunk.Chunk<A>> => {
    if (chunkSize <= 0 || stepSize <= 0) {
      return die(
        new Cause.IllegalArgumentException("Invalid bounds - `chunkSize` and `stepSize` must be greater than zero")
      )
    }
    return new StreamImpl(core.suspend(() => {
      const queue = new RingBuffer<A>(chunkSize)
      const emitOnStreamEnd = (
        queueSize: number,
        channelEnd: Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown>
      ) => {
        if (queueSize < chunkSize) {
          const items = queue.toChunk()
          const result = Chunk.isEmpty(items) ? Chunk.empty<Chunk.Chunk<A>>() : Chunk.of(items)
          return pipe(core.write(result), core.flatMap(() => channelEnd))
        }
        const lastEmitIndex = queueSize - (queueSize - chunkSize) % stepSize
        if (lastEmitIndex === queueSize) {
          return channelEnd
        }
        const leftovers = queueSize - (lastEmitIndex - chunkSize + stepSize)
        const lastItems = pipe(queue.toChunk(), Chunk.takeRight(leftovers))
        const result = Chunk.isEmpty(lastItems) ? Chunk.empty<Chunk.Chunk<A>>() : Chunk.of(lastItems)
        return pipe(core.write(result), core.flatMap(() => channelEnd))
      }
      const reader = (
        queueSize: number
      ): Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown> =>
        core.readWithCause({
          onInput: (input: Chunk.Chunk<A>) =>
            core.flatMap(
              core.write(
                Chunk.filterMap(input, (element, index) => {
                  queue.put(element)
                  const currentIndex = queueSize + index + 1
                  if (currentIndex < chunkSize || (currentIndex - chunkSize) % stepSize > 0) {
                    return Option.none()
                  }
                  return Option.some(queue.toChunk())
                })
              ),
              () => reader(queueSize + input.length)
            ),
          onFailure: (cause) => emitOnStreamEnd(queueSize, core.failCause(cause)),
          onDone: () => emitOnStreamEnd(queueSize, core.unit)
        })
      return pipe(toChannel(self), core.pipeTo(reader(0)))
    }))
  }
)

/** @internal */
export const split = dual<
  <A>(predicate: Predicate<A>) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, Chunk.Chunk<A>>,
  <R, E, A>(self: Stream.Stream<R, E, A>, predicate: Predicate<A>) => Stream.Stream<R, E, Chunk.Chunk<A>>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, predicate: Predicate<A>): Stream.Stream<R, E, Chunk.Chunk<A>> => {
  const split = (
    leftovers: Chunk.Chunk<A>,
    input: Chunk.Chunk<A>
  ): Channel.Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown> => {
    const [chunk, remaining] = pipe(leftovers, Chunk.appendAll(input), Chunk.splitWhere(predicate))
    if (Chunk.isEmpty(chunk) || Chunk.isEmpty(remaining)) {
      return loop(pipe(chunk, Chunk.appendAll(pipe(remaining, Chunk.drop(1)))))
    }
    return pipe(
      core.write(Chunk.of(chunk)),
      core.flatMap(() => split(Chunk.empty(), pipe(remaining, Chunk.drop(1))))
    )
  }
  const loop = (
    leftovers: Chunk.Chunk<A>
  ): Channel.Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown> =>
    core.readWith({
      onInput: (input: Chunk.Chunk<A>) => split(leftovers, input),
      onFailure: core.fail,
      onDone: () => {
        if (Chunk.isEmpty(leftovers)) {
          return core.unit
        }
        if (Option.isNone(pipe(leftovers, Chunk.findFirst(predicate)))) {
          return channel.zipRight(core.write(Chunk.of(leftovers)), core.unit)
        }
        return channel.zipRight(
          split(Chunk.empty(), leftovers),
          core.unit
        )
      }
    })
  return new StreamImpl(pipe(toChannel(self), core.pipeTo(loop(Chunk.empty()))))
})

/** @internal */
export const splitOnChunk = dual<
  <A>(delimiter: Chunk.Chunk<A>) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, Chunk.Chunk<A>>,
  <R, E, A>(self: Stream.Stream<R, E, A>, delimiter: Chunk.Chunk<A>) => Stream.Stream<R, E, Chunk.Chunk<A>>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, delimiter: Chunk.Chunk<A>): Stream.Stream<R, E, Chunk.Chunk<A>> => {
  const next = (
    leftover: Option.Option<Chunk.Chunk<A>>,
    delimiterIndex: number
  ): Channel.Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<Chunk.Chunk<A>>, unknown> =>
    core.readWithCause({
      onInput: (inputChunk: Chunk.Chunk<A>) => {
        let buffer: Array<Chunk.Chunk<A>> | undefined
        const [carry, delimiterCursor] = pipe(
          inputChunk,
          Chunk.reduce(
            [pipe(leftover, Option.getOrElse(() => Chunk.empty<A>())), delimiterIndex] as const,
            ([carry, delimiterCursor], a) => {
              const concatenated = pipe(carry, Chunk.append(a))
              if (
                delimiterCursor < delimiter.length &&
                Equal.equals(a, pipe(delimiter, Chunk.unsafeGet(delimiterCursor)))
              ) {
                if (delimiterCursor + 1 === delimiter.length) {
                  if (buffer === undefined) {
                    buffer = []
                  }
                  buffer.push(pipe(concatenated, Chunk.take(concatenated.length - delimiter.length)))
                  return [Chunk.empty<A>(), 0] as const
                }
                return [concatenated, delimiterCursor + 1] as const
              }
              return [concatenated, Equal.equals(a, pipe(delimiter, Chunk.unsafeGet(0))) ? 1 : 0] as const
            }
          )
        )
        const output = buffer === undefined ? Chunk.empty<Chunk.Chunk<A>>() : Chunk.unsafeFromArray(buffer)
        return core.flatMap(
          core.write(output),
          () => next(Chunk.isNonEmpty(carry) ? Option.some(carry) : Option.none(), delimiterCursor)
        )
      },
      onFailure: (cause) =>
        Option.match(leftover, {
          onNone: () => core.failCause(cause),
          onSome: (chunk) =>
            channel.zipRight(
              core.write(Chunk.of(chunk)),
              core.failCause(cause)
            )
        }),
      onDone: (done) =>
        Option.match(leftover, {
          onNone: () => core.succeed(done),
          onSome: (chunk) => channel.zipRight(core.write(Chunk.of(chunk)), core.succeed(done))
        })
    })
  return new StreamImpl(pipe(toChannel(self), core.pipeTo(next(Option.none(), 0))))
})

/** @internal */
export const splitLines = <R, E>(self: Stream.Stream<R, E, string>): Stream.Stream<R, E, string> =>
  suspend(() => {
    let stringBuilder = ""
    let midCRLF = false
    const splitLinesChunk = (chunk: Chunk.Chunk<string>): Chunk.Chunk<string> => {
      const chunkBuilder: Array<string> = []
      Chunk.map(chunk, (str) => {
        if (str.length !== 0) {
          let from = 0
          let indexOfCR = str.indexOf("\r")
          let indexOfLF = str.indexOf("\n")
          if (midCRLF) {
            if (indexOfLF === 0) {
              chunkBuilder.push(stringBuilder)
              stringBuilder = ""
              from = 1
              indexOfLF = str.indexOf("\n", from)
            } else {
              stringBuilder = stringBuilder + "\r"
            }
            midCRLF = false
          }
          while (indexOfCR !== -1 || indexOfLF !== -1) {
            if (indexOfCR === -1 || (indexOfLF !== -1 && indexOfLF < indexOfCR)) {
              if (stringBuilder.length === 0) {
                chunkBuilder.push(str.substring(from, indexOfLF))
              } else {
                chunkBuilder.push(stringBuilder + str.substring(from, indexOfLF))
                stringBuilder = ""
              }
              from = indexOfLF + 1
              indexOfLF = str.indexOf("\n", from)
            } else {
              if (str.length === indexOfCR + 1) {
                midCRLF = true
                indexOfCR = -1
              } else {
                if (indexOfLF === indexOfCR + 1) {
                  if (stringBuilder.length === 0) {
                    chunkBuilder.push(str.substring(from, indexOfCR))
                  } else {
                    stringBuilder = stringBuilder + str.substring(from, indexOfCR)
                    chunkBuilder.push(stringBuilder)
                    stringBuilder = ""
                  }
                  from = indexOfCR + 2
                  indexOfCR = str.indexOf("\r", from)
                  indexOfLF = str.indexOf("\n", from)
                } else {
                  indexOfCR = str.indexOf("\r", indexOfCR + 1)
                }
              }
            }
          }
          if (midCRLF) {
            stringBuilder = stringBuilder + str.substring(from, str.length - 1)
          } else {
            stringBuilder = stringBuilder + str.substring(from, str.length)
          }
        }
      })
      return Chunk.unsafeFromArray(chunkBuilder)
    }
    const loop: Channel.Channel<R, E, Chunk.Chunk<string>, unknown, E, Chunk.Chunk<string>, unknown> = core
      .readWithCause({
        onInput: (input: Chunk.Chunk<string>) => {
          const out = splitLinesChunk(input)
          return Chunk.isEmpty(out)
            ? loop
            : core.flatMap(core.write(out), () => loop)
        },
        onFailure: (cause) =>
          stringBuilder.length === 0
            ? core.failCause(cause)
            : core.flatMap(core.write(Chunk.of(stringBuilder)), () => core.failCause(cause)),
        onDone: (done) =>
          stringBuilder.length === 0
            ? core.succeed(done)
            : core.flatMap(core.write(Chunk.of(stringBuilder)), () => core.succeed(done))
      })
    return new StreamImpl(core.pipeTo(toChannel(self), loop))
  })

/** @internal */
export const succeed = <A>(value: A): Stream.Stream<never, never, A> => fromChunk(Chunk.of(value))

/** @internal */
export const sync = <A>(evaluate: LazyArg<A>): Stream.Stream<never, never, A> =>
  suspend(() => fromChunk(Chunk.of(evaluate())))

/** @internal */
export const suspend = <R, E, A>(stream: LazyArg<Stream.Stream<R, E, A>>): Stream.Stream<R, E, A> =>
  new StreamImpl(core.suspend(() => toChannel(stream())))

/** @internal */
export const take = dual<
  (n: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, n: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, n: number): Stream.Stream<R, E, A> => {
  if (!Number.isInteger(n)) {
    return die(new Cause.IllegalArgumentException(`${n} must be an integer`))
  }
  const loop = (n: number): Channel.Channel<never, never, Chunk.Chunk<A>, unknown, never, Chunk.Chunk<A>, unknown> =>
    core.readWith({
      onInput: (input: Chunk.Chunk<A>) => {
        const taken = pipe(input, Chunk.take(Math.min(n, Number.POSITIVE_INFINITY)))
        const leftover = Math.max(0, n - taken.length)
        const more = leftover > 0
        if (more) {
          return pipe(core.write(taken), core.flatMap(() => loop(leftover)))
        }
        return core.write(taken)
      },
      onFailure: core.fail,
      onDone: core.succeed
    })
  return new StreamImpl(
    pipe(
      toChannel(self),
      channel.pipeToOrFail(0 < n ? loop(n) : core.unit)
    )
  )
})

/** @internal */
export const takeRight = dual<
  (n: number) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, n: number) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, n: number): Stream.Stream<R, E, A> => {
  if (n <= 0) {
    return empty
  }
  return new StreamImpl(
    pipe(
      Effect.succeed(new RingBuffer<A>(n)),
      Effect.map((queue) => {
        const reader: Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, void> = core.readWith({
          onInput: (input: Chunk.Chunk<A>) => {
            for (const element of input) {
              queue.put(element)
            }
            return reader
          },
          onFailure: core.fail,
          onDone: () => pipe(core.write(queue.toChunk()), channel.zipRight(core.unit))
        })
        return pipe(toChannel(self), core.pipeTo(reader))
      }),
      channel.unwrap
    )
  )
})

/** @internal */
export const takeUntil = dual<
  <A, X extends A>(predicate: Predicate<X>) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, predicate: Predicate<A>) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, predicate: Predicate<A>): Stream.Stream<R, E, A> => {
  const loop: Channel.Channel<never, never, Chunk.Chunk<A>, unknown, never, Chunk.Chunk<A>, unknown> = core.readWith({
    onInput: (input: Chunk.Chunk<A>) => {
      const taken = pipe(input, Chunk.takeWhile((a) => !predicate(a)))
      const last = pipe(input, Chunk.drop(taken.length), Chunk.take(1))
      if (Chunk.isEmpty(last)) {
        return pipe(core.write(taken), core.flatMap(() => loop))
      }
      return core.write(pipe(taken, Chunk.appendAll(last)))
    },
    onFailure: core.fail,
    onDone: core.succeed
  })
  return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(loop)))
})

/** @internal */
export const takeUntilEffect = dual<
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: A) => Effect.Effect<R2, E2, boolean>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    predicate: (a: A) => Effect.Effect<R2, E2, boolean>
  ): Stream.Stream<R | R2, E | E2, A> => {
    const loop = (
      iterator: Iterator<A>
    ): Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, unknown> => {
      const next = iterator.next()
      if (next.done) {
        return core.readWithCause({
          onInput: (elem) => loop(elem[Symbol.iterator]()),
          onFailure: core.failCause,
          onDone: core.succeed
        })
      }
      return pipe(
        predicate(next.value),
        Effect.map((bool) =>
          bool ?
            core.write(Chunk.of(next.value)) :
            pipe(
              core.write(Chunk.of(next.value)),
              core.flatMap(() => loop(iterator))
            )
        ),
        channel.unwrap
      )
    }
    return new StreamImpl(pipe(toChannel(self), core.pipeTo(loop(Chunk.empty<A>()[Symbol.iterator]()))))
  }
)

/** @internal */
export const takeWhile: {
  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, B>
  <B extends A, A = B>(predicate: Predicate<A>): <R, E>(self: Stream.Stream<R, E, B>) => Stream.Stream<R, E, B>
  <R, E, A, B extends A>(self: Stream.Stream<R, E, A>, refinement: Refinement<A, B>): Stream.Stream<R, E, B>
  <R, E, A>(self: Stream.Stream<R, E, A>, predicate: Predicate<A>): Stream.Stream<R, E, A>
} = dual(2, <R, E, A>(self: Stream.Stream<R, E, A>, predicate: Predicate<A>): Stream.Stream<R, E, A> => {
  const loop: Channel.Channel<never, never, Chunk.Chunk<A>, unknown, never, Chunk.Chunk<A>, unknown> = core.readWith({
    onInput: (input: Chunk.Chunk<A>) => {
      const taken = pipe(input, Chunk.takeWhile(predicate))
      const more = taken.length === input.length
      if (more) {
        return pipe(core.write(taken), core.flatMap(() => loop))
      }
      return core.write(taken)
    },
    onFailure: core.fail,
    onDone: core.succeed
  })
  return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(loop)))
})

/** @internal */
export const tap = dual<
  <A, X extends A, R2, E2, _>(
    f: (a: X) => Effect.Effect<R2, E2, _>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): Stream.Stream<R | R2, E | E2, A> => mapEffectSequential(self, (a) => Effect.as(f(a), a))
)

/** @internal */
export const tapBoth = dual<
  <E, XE extends E, A, XA extends A, R2, E2, X, R3, E3, X1>(
    options: {
      readonly onFailure: (e: XE) => Effect.Effect<R2, E2, X>
      readonly onSuccess: (a: XA) => Effect.Effect<R3, E3, X1>
    }
  ) => <R>(self: Stream.Stream<R, E, A>) => Stream.Stream<R | R2 | R3, E | E2 | E3, A>,
  <R, E, A, XE extends E, XA extends A, R2, E2, X, R3, E3, X1>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly onFailure: (e: XE) => Effect.Effect<R2, E2, X>
      readonly onSuccess: (a: XA) => Effect.Effect<R3, E3, X1>
    }
  ) => Stream.Stream<R | R2 | R3, E | E2 | E3, A>
>(
  2,
  (self, { onFailure, onSuccess }) => pipe(self, tapError(onFailure), tap(onSuccess))
)

/** @internal */
export const tapError = dual<
  <E, X extends E, R2, E2, _>(
    f: (error: X) => Effect.Effect<R2, E2, _>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E | E2, A>,
  <R, A, E, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (error: E) => Effect.Effect<R2, E2, _>
  ) => Stream.Stream<R2 | R, E | E2, A>
>(
  2,
  <R, A, E, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (error: E) => Effect.Effect<R2, E2, _>
  ): Stream.Stream<R | R2, E | E2, A> =>
    catchAll(self, (error) => fromEffect(Effect.zipRight(f(error), Effect.fail(error))))
)

/** @internal */
export const tapErrorCause = dual<
  <E, X extends E, R2, E2, _>(
    f: (cause: Cause.Cause<X>) => Effect.Effect<R2, E2, _>
  ) => <R, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E | E2, A>,
  <R, A, E, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, _>
  ) => Stream.Stream<R2 | R, E | E2, A>
>(
  2,
  <R, A, E, R2, E2, _>(
    self: Stream.Stream<R, E, A>,
    f: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, _>
  ): Stream.Stream<R | R2, E | E2, A> => {
    const loop: Channel.Channel<R | R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, unknown> = core
      .readWithCause({
        onInput: (chunk) => core.flatMap(core.write(chunk), () => loop),
        onFailure: (cause) => core.fromEffect(Effect.zipRight(f(cause), Effect.failCause(cause))),
        onDone: core.succeedNow
      })

    return new StreamImpl(pipe(toChannel(self), core.pipeTo(loop)))
  }
)

/** @internal */
export const tapSink = dual<
  <R2, E2, A>(
    sink: Sink.Sink<R2, E2, A, unknown, unknown>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, R2, E2, A>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, unknown, unknown>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, R2, E2, A>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, unknown, unknown>
  ): Stream.Stream<R | R2, E | E2, A> =>
    pipe(
      fromEffect(Effect.all([Queue.bounded<Take.Take<E | E2, A>>(1), Deferred.make<never, void>()])),
      flatMap(([queue, deferred]) => {
        const right = flattenTake(fromQueue(queue, { maxChunkSize: 1 }))
        const loop: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, unknown> = core
          .readWithCause({
            onInput: (chunk: Chunk.Chunk<A>) =>
              pipe(
                core.fromEffect(Queue.offer(queue, _take.chunk(chunk))),
                core.foldCauseChannel({
                  onFailure: () => core.flatMap(core.write(chunk), () => channel.identityChannel()),
                  onSuccess: () => core.flatMap(core.write(chunk), () => loop)
                })
              ) as Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, unknown>,
            onFailure: (cause: Cause.Cause<E | E2>) =>
              pipe(
                core.fromEffect(Queue.offer(queue, _take.failCause(cause))),
                core.foldCauseChannel({
                  onFailure: () => core.failCause(cause),
                  onSuccess: () => core.failCause(cause)
                })
              ),
            onDone: () =>
              pipe(
                core.fromEffect(Queue.offer(queue, _take.end)),
                core.foldCauseChannel({
                  onFailure: () => core.unit,
                  onSuccess: () => core.unit
                })
              )
          })
        return pipe(
          new StreamImpl(pipe(
            core.pipeTo(toChannel(self), loop),
            channel.ensuring(Effect.zipRight(
              Effect.forkDaemon(Queue.offer(queue, _take.end)),
              Deferred.await(deferred)
            ))
          )),
          merge(
            execute(pipe(
              run(right, sink),
              Effect.ensuring(Effect.zipRight(
                Queue.shutdown(queue),
                Deferred.succeed(deferred, void 0)
              ))
            ))
          )
        )
      })
    )
)

/** @internal */
export const throttle = dual<
  <A>(
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => number
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => number
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ) => Stream.Stream<R, E, A>
>(
  2,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => number
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): Stream.Stream<R, E, A> =>
    throttleEffect(self, {
      ...options,
      cost: (chunk) => Effect.succeed(options.cost(chunk))
    })
)

/** @internal */
export const throttleEffect = dual<
  <A, R2, E2>(
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): Stream.Stream<R | R2, E | E2, A> => {
    if (options.strategy === "enforce") {
      return throttleEnforceEffect(self, options.cost, options.units, options.duration, options.burst ?? 0)
    }
    return throttleShapeEffect(self, options.cost, options.units, options.duration, options.burst ?? 0)
  }
)

const throttleEnforceEffect = <R, E, A, R2, E2>(
  self: Stream.Stream<R, E, A>,
  cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>,
  units: number,
  duration: Duration.DurationInput,
  burst: number
): Stream.Stream<R | R2, E | E2, A> => {
  const loop = (
    tokens: number,
    timestampMillis: number
  ): Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, void> =>
    core.readWithCause({
      onInput: (input: Chunk.Chunk<A>) =>
        pipe(
          cost(input),
          Effect.zip(Clock.currentTimeMillis),
          Effect.map(([weight, currentTimeMillis]) => {
            const elapsed = currentTimeMillis - timestampMillis
            const cycles = elapsed / Duration.toMillis(duration)
            const sum = tokens + (cycles * units)
            const max = units + burst < 0 ? Number.POSITIVE_INFINITY : units + burst
            const available = sum < 0 ? max : Math.min(sum, max)
            if (weight <= available) {
              return pipe(
                core.write(input),
                core.flatMap(() => loop(available - weight, currentTimeMillis))
              )
            }
            return loop(tokens, timestampMillis)
          }),
          channel.unwrap
        ),
      onFailure: core.failCause,
      onDone: () => core.unit
    })
  const throttled = pipe(
    Clock.currentTimeMillis,
    Effect.map((currentTimeMillis) => loop(units, currentTimeMillis)),
    channel.unwrap
  )
  return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(throttled)))
}

const throttleShapeEffect = <R, E, A, R2, E2>(
  self: Stream.Stream<R, E, A>,
  costFn: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>,
  units: number,
  duration: Duration.DurationInput,
  burst: number
): Stream.Stream<R | R2, E | E2, A> => {
  const loop = (
    tokens: number,
    timestampMillis: number
  ): Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, void> =>
    core.readWithCause({
      onInput: (input: Chunk.Chunk<A>) =>
        pipe(
          costFn(input),
          Effect.zip(Clock.currentTimeMillis),
          Effect.map(([weight, currentTimeMillis]) => {
            const elapsed = currentTimeMillis - timestampMillis
            const cycles = elapsed / Duration.toMillis(duration)
            const sum = tokens + (cycles * units)
            const max = units + burst < 0 ? Number.POSITIVE_INFINITY : units + burst
            const available = sum < 0 ? max : Math.min(sum, max)
            const remaining = available - weight
            const waitCycles = remaining >= 0 ? 0 : -remaining / units
            const delay = Duration.millis(Math.max(0, waitCycles * Duration.toMillis(duration)))
            if (Duration.greaterThan(delay, Duration.zero)) {
              return pipe(
                core.fromEffect(Clock.sleep(delay)),
                channel.zipRight(core.write(input)),
                core.flatMap(() => loop(remaining, currentTimeMillis))
              )
            }
            return core.flatMap(
              core.write(input),
              () => loop(remaining, currentTimeMillis)
            )
          }),
          channel.unwrap
        ),
      onFailure: core.failCause,
      onDone: () => core.unit
    })
  const throttled = pipe(
    Clock.currentTimeMillis,
    Effect.map((currentTimeMillis) => loop(units, currentTimeMillis)),
    channel.unwrap
  )
  return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(throttled)))
}

/** @internal */
export const tick = (interval: Duration.DurationInput): Stream.Stream<never, never, void> =>
  repeatWithSchedule(void 0, Schedule.spaced(interval))

/** @internal */
export const timeout = dual<
  (duration: Duration.DurationInput) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, duration: Duration.DurationInput) => Stream.Stream<R, E, A>
>(2, <R, E, A>(self: Stream.Stream<R, E, A>, duration: Duration.DurationInput): Stream.Stream<R, E, A> =>
  pipe(
    toPull(self),
    Effect.map(Effect.timeoutFail<Option.Option<E>>({
      onTimeout: () => Option.none(),
      duration
    })),
    fromPull
  ))

/** @internal */
export const timeoutFail = dual<
  <E2>(
    error: LazyArg<E2>,
    duration: Duration.DurationInput
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2 | E, A>,
  <R, E, A, E2>(
    self: Stream.Stream<R, E, A>,
    error: LazyArg<E2>,
    duration: Duration.DurationInput
  ) => Stream.Stream<R, E2 | E, A>
>(
  3,
  <R, E, A, E2>(
    self: Stream.Stream<R, E, A>,
    error: LazyArg<E2>,
    duration: Duration.DurationInput
  ): Stream.Stream<R, E | E2, A> => pipe(self, timeoutTo(duration, failSync(error)))
)

/** @internal */
export const timeoutFailCause = dual<
  <E2>(
    cause: LazyArg<Cause.Cause<E2>>,
    duration: Duration.DurationInput
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E2 | E, A>,
  <R, E, A, E2>(
    self: Stream.Stream<R, E, A>,
    cause: LazyArg<Cause.Cause<E2>>,
    duration: Duration.DurationInput
  ) => Stream.Stream<R, E2 | E, A>
>(
  3,
  <R, E, A, E2>(
    self: Stream.Stream<R, E, A>,
    cause: LazyArg<Cause.Cause<E2>>,
    duration: Duration.DurationInput
  ): Stream.Stream<R, E | E2, A> =>
    pipe(
      toPull(self),
      Effect.map(
        Effect.timeoutFailCause<Option.Option<E | E2>>({
          onTimeout: () => Cause.map(cause(), Option.some),
          duration
        })
      ),
      fromPull
    )
)

/** @internal */
export const timeoutTo = dual<
  <R2, E2, A2>(
    duration: Duration.DurationInput,
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2 | A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    duration: Duration.DurationInput,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2 | A>
>(
  3,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    duration: Duration.DurationInput,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A | A2> => {
    const StreamTimeout = new Cause.RuntimeException("Stream Timeout")
    return pipe(
      self,
      timeoutFailCause<E | E2>(() => Cause.die(StreamTimeout), duration),
      catchSomeCause((cause) =>
        Cause.isDieType(cause) &&
          Cause.isRuntimeException(cause.defect) &&
          cause.defect.message !== undefined &&
          cause.defect.message === "Stream Timeout" ?
          Option.some(that) :
          Option.none()
      )
    )
  }
)

/** @internal */
export const toPubSub = dual<
  (
    capacity: number
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, PubSub.PubSub<Take.Take<E, A>>>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    capacity: number
  ) => Effect.Effect<Scope.Scope | R, never, PubSub.PubSub<Take.Take<E, A>>>
>(2, <R, E, A>(
  self: Stream.Stream<R, E, A>,
  capacity: number
): Effect.Effect<R | Scope.Scope, never, PubSub.PubSub<Take.Take<E, A>>> =>
  pipe(
    Effect.acquireRelease(
      PubSub.bounded<Take.Take<E, A>>(capacity),
      (pubsub) => PubSub.shutdown(pubsub)
    ),
    Effect.tap((pubsub) => pipe(self, runIntoPubSubScoped(pubsub), Effect.forkScoped))
  ))

/** @internal */
export const toPull = <R, E, A>(
  self: Stream.Stream<R, E, A>
): Effect.Effect<R | Scope.Scope, never, Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>> =>
  Effect.map(channel.toPull(toChannel(self)), (pull) =>
    pipe(
      pull,
      Effect.mapError(Option.some),
      Effect.flatMap(Either.match({
        onLeft: () => Effect.fail(Option.none()),
        onRight: Effect.succeed
      }))
    ))

/** @internal */
export const toQueue = dual<
  (
    options?: {
      readonly strategy?: "suspend" | "sliding" | "dropping" | undefined
      readonly capacity?: number | undefined
    } | {
      readonly strategy: "unbounded"
    }
  ) => <R, E, A>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<R | Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    options?: {
      readonly strategy?: "suspend" | "sliding" | "dropping" | undefined
      readonly capacity?: number | undefined
    } | {
      readonly strategy: "unbounded"
    }
  ) => Effect.Effect<R | Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>
>((args) => isStream(args[0]), <R, E, A>(
  self: Stream.Stream<R, E, A>,
  options?: {
    readonly strategy?: "suspend" | "sliding" | "dropping" | undefined
    readonly capacity?: number | undefined
  } | {
    readonly strategy: "unbounded"
  }
) =>
  Effect.tap(
    Effect.acquireRelease(
      options?.strategy === "unbounded" ?
        Queue.unbounded<Take.Take<E, A>>() :
        options?.strategy === "dropping" ?
        Queue.dropping<Take.Take<E, A>>(options.capacity ?? 2) :
        options?.strategy === "sliding" ?
        Queue.sliding<Take.Take<E, A>>(options.capacity ?? 2) :
        Queue.bounded<Take.Take<E, A>>(options?.capacity ?? 2),
      (queue) => Queue.shutdown(queue)
    ),
    (queue) => Effect.forkScoped(runIntoQueueScoped(self, queue))
  ))

/** @internal */
export const toQueueOfElements = dual<
  (options?: {
    readonly capacity?: number | undefined
  }) => <R, E, A>(
    self: Stream.Stream<R, E, A>
  ) => Effect.Effect<R | Scope.Scope, never, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    options?: {
      readonly capacity?: number | undefined
    }
  ) => Effect.Effect<R | Scope.Scope, never, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>>
>((args) => isStream(args[0]), <R, E, A>(
  self: Stream.Stream<R, E, A>,
  options?: {
    readonly capacity?: number | undefined
  }
) =>
  Effect.tap(
    Effect.acquireRelease(
      Queue.bounded<Exit.Exit<Option.Option<E>, A>>(options?.capacity ?? 2),
      (queue) => Queue.shutdown(queue)
    ),
    (queue) => Effect.forkScoped(runIntoQueueElementsScoped(self, queue))
  ))

/** @internal */
export const toReadableStream = <E, A>(source: Stream.Stream<never, E, A>) => {
  let pull: Effect.Effect<never, never, void>
  let scope: Scope.CloseableScope
  return new ReadableStream<A>({
    start(controller) {
      scope = Effect.runSync(Scope.make())
      pull = pipe(
        toPull(source),
        Scope.use(scope),
        Effect.runSync,
        Effect.tap((chunk) =>
          Effect.sync(() => {
            Chunk.map(chunk, (a) => {
              controller.enqueue(a)
            })
          })
        ),
        Effect.tapErrorCause(() => Scope.close(scope, Exit.unit)),
        Effect.catchTags({
          "None": () =>
            Effect.sync(() => {
              controller.close()
            }),
          "Some": (error) =>
            Effect.sync(() => {
              controller.error(error.value)
            })
        }),
        Effect.asUnit
      )
    },
    pull() {
      return Effect.runPromise(pull)
    },
    cancel() {
      return Effect.runPromise(Scope.close(scope, Exit.unit))
    }
  })
}

/** @internal */
export const transduce = dual<
  <R2, E2, A, Z>(
    sink: Sink.Sink<R2, E2, A, A, Z>
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, Z>,
  <R, E, R2, E2, A, Z>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, A, Z>
  ) => Stream.Stream<R2 | R, E2 | E, Z>
>(
  2,
  <R, E, R2, E2, A, Z>(
    self: Stream.Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, A, Z>
  ): Stream.Stream<R | R2, E | E2, Z> => {
    const newChannel = core.suspend(() => {
      const leftovers = { ref: Chunk.empty<Chunk.Chunk<A>>() }
      const upstreamDone = { ref: false }
      const buffer: Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> = core.suspend(
        () => {
          const leftover = leftovers.ref
          if (Chunk.isEmpty(leftover)) {
            return core.readWith({
              onInput: (input) => pipe(core.write(input), core.flatMap(() => buffer)),
              onFailure: core.fail,
              onDone: core.succeedNow
            })
          }
          leftovers.ref = Chunk.empty<Chunk.Chunk<A>>()
          return pipe(channel.writeChunk(leftover), core.flatMap(() => buffer))
        }
      )
      const concatAndGet = (chunk: Chunk.Chunk<Chunk.Chunk<A>>): Chunk.Chunk<Chunk.Chunk<A>> => {
        const leftover = leftovers.ref
        const concatenated = Chunk.appendAll(leftover, Chunk.filter(chunk, (chunk) => chunk.length !== 0))
        leftovers.ref = concatenated
        return concatenated
      }
      const upstreamMarker: Channel.Channel<never, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> = core
        .readWith({
          onInput: (input: Chunk.Chunk<A>) => core.flatMap(core.write(input), () => upstreamMarker),
          onFailure: core.fail,
          onDone: (done) =>
            channel.zipRight(
              core.sync(() => {
                upstreamDone.ref = true
              }),
              core.succeedNow(done)
            )
        })
      const transducer: Channel.Channel<R | R2, never, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<Z>, void> = pipe(
        sink,
        _sink.toChannel,
        core.collectElements,
        core.flatMap(([leftover, z]) =>
          pipe(
            core.succeed([upstreamDone.ref, concatAndGet(leftover)] as const),
            core.flatMap(([done, newLeftovers]) => {
              const nextChannel = done && Chunk.isEmpty(newLeftovers) ?
                core.unit :
                transducer
              return pipe(core.write(Chunk.of(z)), core.flatMap(() => nextChannel))
            })
          )
        )
      )
      return pipe(
        toChannel(self),
        core.pipeTo(upstreamMarker),
        core.pipeTo(buffer),
        channel.pipeToOrFail(transducer)
      )
    })
    return new StreamImpl(newChannel)
  }
)

/** @internal */
export const unfold = <S, A>(s: S, f: (s: S) => Option.Option<readonly [A, S]>): Stream.Stream<never, never, A> =>
  unfoldChunk(s, (s) => pipe(f(s), Option.map(([a, s]) => [Chunk.of(a), s])))

/** @internal */
export const unfoldChunk = <S, A>(
  s: S,
  f: (s: S) => Option.Option<readonly [Chunk.Chunk<A>, S]>
): Stream.Stream<never, never, A> => {
  const loop = (s: S): Channel.Channel<never, unknown, unknown, unknown, never, Chunk.Chunk<A>, unknown> =>
    Option.match(f(s), {
      onNone: () => core.unit,
      onSome: ([chunk, s]) => core.flatMap(core.write(chunk), () => loop(s))
    })
  return new StreamImpl(core.suspend(() => loop(s)))
}

/** @internal */
export const unfoldChunkEffect = <R, E, A, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [Chunk.Chunk<A>, S]>>
): Stream.Stream<R, E, A> =>
  suspend(() => {
    const loop = (s: S): Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown> =>
      channel.unwrap(
        Effect.map(
          f(s),
          Option.match({
            onNone: () => core.unit,
            onSome: ([chunk, s]) => core.flatMap(core.write(chunk), () => loop(s))
          })
        )
      )
    return new StreamImpl(loop(s))
  })

/** @internal */
export const unfoldEffect = <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>
): Stream.Stream<R, E, A> =>
  unfoldChunkEffect(s, (s) => pipe(f(s), Effect.map(Option.map(([a, s]) => [Chunk.of(a), s]))))

/** @internal */
export const unit: Stream.Stream<never, never, void> = succeed(void 0)

/** @internal */
export const unwrap = <R, E, R2, E2, A>(
  effect: Effect.Effect<R, E, Stream.Stream<R2, E2, A>>
): Stream.Stream<R | R2, E | E2, A> => flatten(fromEffect(effect))

/** @internal */
export const unwrapScoped = <R, E, R2, E2, A>(
  effect: Effect.Effect<R, E, Stream.Stream<R2, E2, A>>
): Stream.Stream<Exclude<R, Scope.Scope> | R2, E | E2, A> => flatten(scoped(effect))

/** @internal */
export const updateService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<T | R, E, A>,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Stream.Stream<R, E, A>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => Stream.Stream<T | R, E, A>
>(
  3,
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Stream.Stream<R, E, A>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ): Stream.Stream<R | T, E, A> =>
    pipe(
      self,
      mapInputContext((context) =>
        pipe(
          context,
          Context.add(tag, f(pipe(context, Context.unsafeGet(tag))))
        )
      )
    )
)

/** @internal */
export const when = dual<
  (test: LazyArg<boolean>) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R, E, A>,
  <R, E, A>(self: Stream.Stream<R, E, A>, test: LazyArg<boolean>) => Stream.Stream<R, E, A>
>(
  2,
  <R, E, A>(self: Stream.Stream<R, E, A>, test: LazyArg<boolean>): Stream.Stream<R, E, A> =>
    pipe(self, whenEffect(Effect.sync(test)))
)

/** @internal */
export const whenCase = <A, R, E, A2>(
  evaluate: LazyArg<A>,
  pf: (a: A) => Option.Option<Stream.Stream<R, E, A2>>
) => whenCaseEffect(pf)(Effect.sync(evaluate))

/** @internal */
export const whenCaseEffect = dual<
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Stream.Stream<R2, E2, A2>>
  ) => <R, E>(self: Effect.Effect<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    pf: (a: A) => Option.Option<Stream.Stream<R2, E2, A2>>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    pf: (a: A) => Option.Option<Stream.Stream<R2, E2, A2>>
  ): Stream.Stream<R | R2, E | E2, A2> =>
    pipe(
      fromEffect(self),
      flatMap((a) => pipe(pf(a), Option.getOrElse(() => empty)))
    )
)

/** @internal */
export const whenEffect = dual<
  <R2, E2>(
    effect: Effect.Effect<R2, E2, boolean>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    effect: Effect.Effect<R2, E2, boolean>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2>(
    self: Stream.Stream<R, E, A>,
    effect: Effect.Effect<R2, E2, boolean>
  ): Stream.Stream<R | R2, E | E2, A> => pipe(fromEffect(effect), flatMap((bool) => bool ? self : empty))
)

/** @internal */
export const withSpan = dual<
  (
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<Exclude<R, Tracer.ParentSpan>, E, A>,
  <R, E, A>(
    self: Stream.Stream<R, E, A>,
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ) => Stream.Stream<Exclude<R, Tracer.ParentSpan>, E, A>
>(3, (self, name, options) => new StreamImpl(channel.withSpan(toChannel(self), name, options)))

/** @internal */
export const zip = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, [A, A2]>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, [A, A2]>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, [A, A2]> => pipe(self, zipWith(that, (a, a2) => [a, a2]))
)

/** @internal */
export const zipFlatten = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A extends ReadonlyArray<any>>(
    self: Stream.Stream<R, E, A>
  ) => Stream.Stream<R2 | R, E2 | E, [...A, A2]>,
  <R, E, A extends ReadonlyArray<any>, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, [...A, A2]>
>(
  2,
  <R, E, A extends ReadonlyArray<any>, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, [...A, A2]> => pipe(self, zipWith(that, (a, a2) => [...a, a2]))
)

/** @internal */
export const zipAll = dual<
  <R2, E2, A2, A>(
    options: {
      readonly other: Stream.Stream<R2, E2, A2>
      readonly defaultSelf: A
      readonly defaultOther: A2
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, [A, A2]>,
  <R, E, R2, E2, A2, A>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly other: Stream.Stream<R2, E2, A2>
      readonly defaultSelf: A
      readonly defaultOther: A2
    }
  ) => Stream.Stream<R2 | R, E2 | E, [A, A2]>
>(
  2,
  <R, E, R2, E2, A2, A>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly other: Stream.Stream<R2, E2, A2>
      readonly defaultSelf: A
      readonly defaultOther: A2
    }
  ): Stream.Stream<R | R2, E | E2, [A, A2]> =>
    zipAllWith(self, {
      other: options.other,
      onSelf: (a) => [a, options.defaultOther],
      onOther: (a2) => [options.defaultSelf, a2],
      onBoth: (a, a2) => [a, a2]
    })
)

/** @internal */
export const zipAllLeft = dual<
  <R2, E2, A2, A>(
    that: Stream.Stream<R2, E2, A2>,
    defaultLeft: A
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, R2, E2, A2, A>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    defaultLeft: A
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  3,
  <R, E, R2, E2, A2, A>(
    self: Stream.Stream<R, E, A>,
    other: Stream.Stream<R2, E2, A2>,
    defaultSelf: A
  ): Stream.Stream<R | R2, E | E2, A> =>
    zipAllWith(self, {
      other,
      onSelf: identity,
      onOther: () => defaultSelf,
      onBoth: (a) => a
    })
)

/** @internal */
export const zipAllRight = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>,
    defaultRight: A2
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    defaultRight: A2
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  3,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    other: Stream.Stream<R2, E2, A2>,
    defaultRight: A2
  ): Stream.Stream<R | R2, E | E2, A2> =>
    zipAllWith(self, {
      other,
      onSelf: () => defaultRight,
      onOther: identity,
      onBoth: (_, a2) => a2
    })
)

/** @internal */
export const zipAllSortedByKey = dual<
  <R2, E2, A2, A, K>(
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ) => <R, E>(
    self: Stream.Stream<R, E, readonly [K, A]>
  ) => Stream.Stream<R2 | R, E2 | E, [K, [A, A2]]>,
  <R, E, R2, E2, A2, A, K>(
    self: Stream.Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ) => Stream.Stream<R2 | R, E2 | E, [K, [A, A2]]>
>(
  2,
  <R, E, R2, E2, A2, A, K>(
    self: Stream.Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): Stream.Stream<R | R2, E | E2, [K, [A, A2]]> =>
    zipAllSortedByKeyWith(self, {
      other: options.other,
      onSelf: (a) => [a, options.defaultOther],
      onOther: (a2) => [options.defaultSelf, a2],
      onBoth: (a, a2) => [a, a2],
      order: options.order
    })
)

/** @internal */
export const zipAllSortedByKeyLeft = dual<
  <R2, E2, A2, A, K>(
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly order: Order.Order<K>
    }
  ) => <R, E>(self: Stream.Stream<R, E, readonly [K, A]>) => Stream.Stream<R2 | R, E2 | E, [K, A]>,
  <R, E, R2, E2, A2, A, K>(
    self: Stream.Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly order: Order.Order<K>
    }
  ) => Stream.Stream<R2 | R, E2 | E, [K, A]>
>(
  2,
  <R, E, R2, E2, A2, A, K>(
    self: Stream.Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly order: Order.Order<K>
    }
  ): Stream.Stream<R | R2, E | E2, [K, A]> =>
    zipAllSortedByKeyWith(self, {
      other: options.other,
      onSelf: identity,
      onOther: () => options.defaultSelf,
      onBoth: (a) => a,
      order: options.order
    })
)

/** @internal */
export const zipAllSortedByKeyRight = dual<
  <R2, E2, A2, K>(
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ) => <R, E, A>(self: Stream.Stream<R, E, readonly [K, A]>) => Stream.Stream<R2 | R, E2 | E, [K, A2]>,
  <R, E, A, R2, E2, A2, K>(
    self: Stream.Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ) => Stream.Stream<R2 | R, E2 | E, [K, A2]>
>(
  2,
  <R, E, A, R2, E2, A2, K>(
    self: Stream.Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): Stream.Stream<R | R2, E | E2, [K, A2]> =>
    zipAllSortedByKeyWith(self, {
      other: options.other,
      onSelf: () => options.defaultOther,
      onOther: identity,
      onBoth: (_, a2) => a2,
      order: options.order
    })
)

/** @internal */
export const zipAllSortedByKeyWith = dual<
  <R2, E2, A, A3, A2, K>(
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
      readonly order: Order.Order<K>
    }
  ) => <R, E>(self: Stream.Stream<R, E, readonly [K, A]>) => Stream.Stream<R2 | R, E2 | E, [K, A3]>,
  <R, E, R2, E2, A, A3, A2, K>(
    self: Stream.Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
      readonly order: Order.Order<K>
    }
  ) => Stream.Stream<R2 | R, E2 | E, [K, A3]>
>(
  2,
  <R, E, R2, E2, A, A3, A2, K>(
    self: Stream.Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream.Stream<R2, E2, readonly [K, A2]>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
      readonly order: Order.Order<K>
    }
  ): Stream.Stream<R | R2, E | E2, [K, A3]> => {
    const pull = (
      state: ZipAllState.ZipAllState<readonly [K, A], readonly [K, A2]>,
      pullLeft: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<readonly [K, A]>>,
      pullRight: Effect.Effect<R2, Option.Option<E2>, Chunk.Chunk<readonly [K, A2]>>
    ): Effect.Effect<
      R | R2,
      never,
      Exit.Exit<
        Option.Option<E | E2>,
        readonly [
          Chunk.Chunk<[K, A3]>,
          ZipAllState.ZipAllState<readonly [K, A], readonly [K, A2]>
        ]
      >
    > => {
      switch (state._tag) {
        case ZipAllState.OP_DRAIN_LEFT: {
          return pipe(
            pullLeft,
            Effect.match({
              onFailure: Exit.fail,
              onSuccess: (leftChunk) =>
                Exit.succeed(
                  [
                    Chunk.map(leftChunk, ([k, a]) => [k, options.onSelf(a)]),
                    ZipAllState.DrainLeft
                  ] as const
                )
            })
          )
        }
        case ZipAllState.OP_DRAIN_RIGHT: {
          return pipe(
            pullRight,
            Effect.match({
              onFailure: Exit.fail,
              onSuccess: (rightChunk) =>
                Exit.succeed(
                  [
                    Chunk.map(rightChunk, ([k, a2]) => [k, options.onOther(a2)]),
                    ZipAllState.DrainRight
                  ] as const
                )
            })
          )
        }
        case ZipAllState.OP_PULL_BOTH: {
          return pipe(
            unsome(pullLeft),
            Effect.zip(unsome(pullRight), { concurrent: true }),
            Effect.matchEffect({
              onFailure: (error) => Effect.succeed(Exit.fail(Option.some(error))),
              onSuccess: ([leftOption, rightOption]) => {
                if (Option.isSome(leftOption) && Option.isSome(rightOption)) {
                  if (Chunk.isEmpty(leftOption.value) && Chunk.isEmpty(rightOption.value)) {
                    return pull(ZipAllState.PullBoth, pullLeft, pullRight)
                  }
                  if (Chunk.isEmpty(leftOption.value)) {
                    return pull(ZipAllState.PullLeft(rightOption.value), pullLeft, pullRight)
                  }
                  if (Chunk.isEmpty(rightOption.value)) {
                    return pull(ZipAllState.PullRight(leftOption.value), pullLeft, pullRight)
                  }
                  return Effect.succeed(Exit.succeed(merge(leftOption.value, rightOption.value)))
                }
                if (Option.isSome(leftOption) && Option.isNone(rightOption)) {
                  if (Chunk.isEmpty(leftOption.value)) {
                    return pull(ZipAllState.DrainLeft, pullLeft, pullRight)
                  }
                  return Effect.succeed(
                    Exit.succeed(
                      [
                        pipe(leftOption.value, Chunk.map(([k, a]) => [k, options.onSelf(a)])),
                        ZipAllState.DrainLeft
                      ] as const
                    )
                  )
                }
                if (Option.isNone(leftOption) && Option.isSome(rightOption)) {
                  if (Chunk.isEmpty(rightOption.value)) {
                    return pull(ZipAllState.DrainRight, pullLeft, pullRight)
                  }
                  return Effect.succeed(
                    Exit.succeed(
                      [
                        pipe(rightOption.value, Chunk.map(([k, a2]) => [k, options.onOther(a2)])),
                        ZipAllState.DrainRight
                      ] as const
                    )
                  )
                }
                return Effect.succeed(Exit.fail<Option.Option<E | E2>>(Option.none()))
              }
            })
          )
        }
        case ZipAllState.OP_PULL_LEFT: {
          return Effect.matchEffect(pullLeft, {
            onFailure: Option.match({
              onNone: () =>
                Effect.succeed(
                  Exit.succeed([
                    pipe(state.rightChunk, Chunk.map(([k, a2]) => [k, options.onOther(a2)])),
                    ZipAllState.DrainRight
                  ])
                ),
              onSome: (error) =>
                Effect.succeed<
                  Exit.Exit<
                    Option.Option<E | E2>,
                    readonly [
                      Chunk.Chunk<[K, A3]>,
                      ZipAllState.ZipAllState<readonly [K, A], readonly [K, A2]>
                    ]
                  >
                >(Exit.fail(Option.some(error)))
            }),
            onSuccess: (leftChunk) =>
              Chunk.isEmpty(leftChunk) ?
                pull(ZipAllState.PullLeft(state.rightChunk), pullLeft, pullRight) :
                Effect.succeed(Exit.succeed(merge(leftChunk, state.rightChunk)))
          })
        }
        case ZipAllState.OP_PULL_RIGHT: {
          return Effect.matchEffect(pullRight, {
            onFailure: Option.match({
              onNone: () =>
                Effect.succeed(
                  Exit.succeed(
                    [
                      Chunk.map(state.leftChunk, ([k, a]) => [k, options.onSelf(a)]),
                      ZipAllState.DrainLeft
                    ] as const
                  )
                ),
              onSome: (error) =>
                Effect.succeed<
                  Exit.Exit<
                    Option.Option<E | E2>,
                    readonly [
                      Chunk.Chunk<[K, A3]>,
                      ZipAllState.ZipAllState<readonly [K, A], readonly [K, A2]>
                    ]
                  >
                >(Exit.fail(Option.some(error)))
            }),
            onSuccess: (rightChunk) =>
              Chunk.isEmpty(rightChunk) ?
                pull(ZipAllState.PullRight(state.leftChunk), pullLeft, pullRight) :
                Effect.succeed(Exit.succeed(merge(state.leftChunk, rightChunk)))
          })
        }
      }
    }
    const merge = (
      leftChunk: Chunk.Chunk<readonly [K, A]>,
      rightChunk: Chunk.Chunk<readonly [K, A2]>
    ): readonly [
      Chunk.Chunk<[K, A3]>,
      ZipAllState.ZipAllState<readonly [K, A], readonly [K, A2]>
    ] => {
      const hasNext = <T>(chunk: Chunk.Chunk<T>, index: number) => index < chunk.length - 1
      const builder: Array<[K, A3]> = []
      let state:
        | ZipAllState.ZipAllState<
          readonly [K, A],
          readonly [K, A2]
        >
        | undefined = undefined
      let leftIndex = 0
      let rightIndex = 0
      let leftTuple = pipe(leftChunk, Chunk.unsafeGet(leftIndex))
      let rightTuple = pipe(rightChunk, Chunk.unsafeGet(rightIndex))
      let k1 = leftTuple[0]
      let a = leftTuple[1]
      let k2 = rightTuple[0]
      let a2 = rightTuple[1]
      let loop = true
      while (loop) {
        const compare = options.order(k1, k2)
        if (compare === 0) {
          builder.push([k1, options.onBoth(a, a2)])
          if (hasNext(leftChunk, leftIndex) && hasNext(rightChunk, rightIndex)) {
            leftIndex = leftIndex + 1
            rightIndex = rightIndex + 1
            leftTuple = pipe(leftChunk, Chunk.unsafeGet(leftIndex))
            rightTuple = pipe(rightChunk, Chunk.unsafeGet(rightIndex))
            k1 = leftTuple[0]
            a = leftTuple[1]
            k2 = rightTuple[0]
            a2 = rightTuple[1]
          } else if (hasNext(leftChunk, leftIndex)) {
            state = ZipAllState.PullRight(pipe(leftChunk, Chunk.drop(leftIndex + 1)))
            loop = false
          } else if (hasNext(rightChunk, rightIndex)) {
            state = ZipAllState.PullLeft(pipe(rightChunk, Chunk.drop(rightIndex + 1)))
            loop = false
          } else {
            state = ZipAllState.PullBoth
            loop = false
          }
        } else if (compare < 0) {
          builder.push([k1, options.onSelf(a)])
          if (hasNext(leftChunk, leftIndex)) {
            leftIndex = leftIndex + 1
            leftTuple = pipe(leftChunk, Chunk.unsafeGet(leftIndex))
            k1 = leftTuple[0]
            a = leftTuple[1]
          } else {
            const rightBuilder: Array<readonly [K, A2]> = []
            rightBuilder.push(rightTuple)
            while (hasNext(rightChunk, rightIndex)) {
              rightIndex = rightIndex + 1
              rightTuple = pipe(rightChunk, Chunk.unsafeGet(rightIndex))
              rightBuilder.push(rightTuple)
            }
            state = ZipAllState.PullLeft(Chunk.unsafeFromArray(rightBuilder))
            loop = false
          }
        } else {
          builder.push([k2, options.onOther(a2)])
          if (hasNext(rightChunk, rightIndex)) {
            rightIndex = rightIndex + 1
            rightTuple = pipe(rightChunk, Chunk.unsafeGet(rightIndex))
            k2 = rightTuple[0]
            a2 = rightTuple[1]
          } else {
            const leftBuilder: Array<readonly [K, A]> = []
            leftBuilder.push(leftTuple)
            while (hasNext(leftChunk, leftIndex)) {
              leftIndex = leftIndex + 1
              leftTuple = pipe(leftChunk, Chunk.unsafeGet(leftIndex))
              leftBuilder.push(leftTuple)
            }
            state = ZipAllState.PullRight(Chunk.unsafeFromArray(leftBuilder))
            loop = false
          }
        }
      }
      return [Chunk.unsafeFromArray(builder), state!]
    }
    return combineChunks(self, options.other, ZipAllState.PullBoth, pull)
  }
)

/** @internal */
export const zipAllWith = dual<
  <R2, E2, A2, A, A3>(
    options: {
      readonly other: Stream.Stream<R2, E2, A2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
    }
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A3>,
  <R, E, R2, E2, A2, A, A3>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly other: Stream.Stream<R2, E2, A2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
    }
  ) => Stream.Stream<R2 | R, E2 | E, A3>
>(
  2,
  <R, E, R2, E2, A2, A, A3>(
    self: Stream.Stream<R, E, A>,
    options: {
      readonly other: Stream.Stream<R2, E2, A2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
    }
  ): Stream.Stream<R | R2, E | E2, A3> => {
    const pull = (
      state: ZipAllState.ZipAllState<A, A2>,
      pullLeft: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>,
      pullRight: Effect.Effect<R2, Option.Option<E2>, Chunk.Chunk<A2>>
    ): Effect.Effect<
      R | R2,
      never,
      Exit.Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, ZipAllState.ZipAllState<A, A2>]>
    > => {
      switch (state._tag) {
        case ZipAllState.OP_DRAIN_LEFT: {
          return Effect.matchEffect(pullLeft, {
            onFailure: (error) => Effect.succeed(Exit.fail(error)),
            onSuccess: (leftChunk) =>
              Effect.succeed(Exit.succeed(
                [
                  Chunk.map(leftChunk, options.onSelf),
                  ZipAllState.DrainLeft
                ] as const
              ))
          })
        }
        case ZipAllState.OP_DRAIN_RIGHT: {
          return Effect.matchEffect(pullRight, {
            onFailure: (error) => Effect.succeed(Exit.fail(error)),
            onSuccess: (rightChunk) =>
              Effect.succeed(Exit.succeed(
                [
                  Chunk.map(rightChunk, options.onOther),
                  ZipAllState.DrainRight
                ] as const
              ))
          })
        }
        case ZipAllState.OP_PULL_BOTH: {
          return pipe(
            unsome(pullLeft),
            Effect.zip(unsome(pullRight), { concurrent: true }),
            Effect.matchEffect({
              onFailure: (error) => Effect.succeed(Exit.fail(Option.some(error))),
              onSuccess: ([leftOption, rightOption]) => {
                if (Option.isSome(leftOption) && Option.isSome(rightOption)) {
                  if (Chunk.isEmpty(leftOption.value) && Chunk.isEmpty(rightOption.value)) {
                    return pull(ZipAllState.PullBoth, pullLeft, pullRight)
                  }
                  if (Chunk.isEmpty(leftOption.value)) {
                    return pull(ZipAllState.PullLeft(rightOption.value), pullLeft, pullRight)
                  }
                  if (Chunk.isEmpty(rightOption.value)) {
                    return pull(ZipAllState.PullRight(leftOption.value), pullLeft, pullRight)
                  }
                  return Effect.succeed(Exit.succeed(zip(leftOption.value, rightOption.value, options.onBoth)))
                }
                if (Option.isSome(leftOption) && Option.isNone(rightOption)) {
                  return Effect.succeed(Exit.succeed(
                    [
                      Chunk.map(leftOption.value, options.onSelf),
                      ZipAllState.DrainLeft
                    ] as const
                  ))
                }
                if (Option.isNone(leftOption) && Option.isSome(rightOption)) {
                  return Effect.succeed(Exit.succeed(
                    [
                      Chunk.map(rightOption.value, options.onOther),
                      ZipAllState.DrainRight
                    ] as const
                  ))
                }
                return Effect.succeed(Exit.fail<Option.Option<E | E2>>(Option.none()))
              }
            })
          )
        }
        case ZipAllState.OP_PULL_LEFT: {
          return Effect.matchEffect(pullLeft, {
            onFailure: Option.match({
              onNone: () =>
                Effect.succeed(Exit.succeed(
                  [
                    Chunk.map(state.rightChunk, options.onOther),
                    ZipAllState.DrainRight
                  ] as const
                )),
              onSome: (error) =>
                Effect.succeed<
                  Exit.Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, ZipAllState.ZipAllState<A, A2>]>
                >(
                  Exit.fail(Option.some(error))
                )
            }),
            onSuccess: (leftChunk) => {
              if (Chunk.isEmpty(leftChunk)) {
                return pull(ZipAllState.PullLeft(state.rightChunk), pullLeft, pullRight)
              }
              if (Chunk.isEmpty(state.rightChunk)) {
                return pull(ZipAllState.PullRight(leftChunk), pullLeft, pullRight)
              }
              return Effect.succeed(Exit.succeed(zip(leftChunk, state.rightChunk, options.onBoth)))
            }
          })
        }
        case ZipAllState.OP_PULL_RIGHT: {
          return Effect.matchEffect(pullRight, {
            onFailure: Option.match({
              onNone: () =>
                Effect.succeed(
                  Exit.succeed(
                    [
                      Chunk.map(state.leftChunk, options.onSelf),
                      ZipAllState.DrainLeft
                    ] as const
                  )
                ),
              onSome: (error) =>
                Effect.succeed<
                  Exit.Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, ZipAllState.ZipAllState<A, A2>]>
                >(
                  Exit.fail(Option.some(error))
                )
            }),
            onSuccess: (rightChunk) => {
              if (Chunk.isEmpty(rightChunk)) {
                return pull(
                  ZipAllState.PullRight(state.leftChunk),
                  pullLeft,
                  pullRight
                )
              }
              if (Chunk.isEmpty(state.leftChunk)) {
                return pull(
                  ZipAllState.PullLeft(rightChunk),
                  pullLeft,
                  pullRight
                )
              }
              return Effect.succeed(Exit.succeed(zip(state.leftChunk, rightChunk, options.onBoth)))
            }
          })
        }
      }
    }
    const zip = (
      leftChunk: Chunk.Chunk<A>,
      rightChunk: Chunk.Chunk<A2>,
      f: (a: A, a2: A2) => A3
    ): readonly [Chunk.Chunk<A3>, ZipAllState.ZipAllState<A, A2>] => {
      const [output, either] = zipChunks(leftChunk, rightChunk, f)
      switch (either._tag) {
        case "Left": {
          if (Chunk.isEmpty(either.left)) {
            return [output, ZipAllState.PullBoth] as const
          }
          return [output, ZipAllState.PullRight(either.left)] as const
        }
        case "Right": {
          if (Chunk.isEmpty(either.right)) {
            return [output, ZipAllState.PullBoth] as const
          }
          return [output, ZipAllState.PullLeft(either.right)] as const
        }
      }
    }
    return combineChunks(self, options.other, ZipAllState.PullBoth, pull)
  }
)

/** @internal */
export const zipLatest = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, [A, A2]>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, [A, A2]>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, [A, A2]> => pipe(self, zipLatestWith(that, (a, a2) => [a, a2]))
)

/** @internal */
export const zipLatestWith = dual<
  <R2, E2, A2, A, A3>(
    that: Stream.Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A3>,
  <R, E, R2, E2, A2, A, A3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ) => Stream.Stream<R2 | R, E2 | E, A3>
>(
  3,
  <R, E, R2, E2, A2, A, A3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): Stream.Stream<R | R2, E | E2, A3> => {
    const pullNonEmpty = <_R, _E, _A>(
      pull: Effect.Effect<_R, Option.Option<_E>, Chunk.Chunk<_A>>
    ): Effect.Effect<_R, Option.Option<_E>, Chunk.Chunk<_A>> =>
      pipe(pull, Effect.flatMap((chunk) => Chunk.isEmpty(chunk) ? pullNonEmpty(pull) : Effect.succeed(chunk)))
    return pipe(
      toPull(self),
      Effect.map(pullNonEmpty),
      Effect.zip(pipe(toPull(that), Effect.map(pullNonEmpty))),
      Effect.flatMap(([left, right]) =>
        pipe(
          fromEffectOption<R | R2, E | E2, readonly [Chunk.Chunk<A>, Chunk.Chunk<A2>, boolean]>(
            Effect.raceWith(left, right, {
              onSelfDone: (leftDone, rightFiber) =>
                pipe(
                  Effect.suspend(() => leftDone),
                  Effect.zipWith(Fiber.join(rightFiber), (l, r) => [l, r, true] as const)
                ),
              onOtherDone: (rightDone, leftFiber) =>
                pipe(
                  Effect.suspend(() => rightDone),
                  Effect.zipWith(Fiber.join(leftFiber), (l, r) => [r, l, false] as const)
                )
            })
          ),
          flatMap(([l, r, leftFirst]) =>
            pipe(
              fromEffect(
                Ref.make([Chunk.unsafeLast(l), Chunk.unsafeLast(r)] as const)
              ),
              flatMap((latest) =>
                pipe(
                  fromChunk(
                    leftFirst ?
                      pipe(r, Chunk.map((a2) => f(Chunk.unsafeLast(l), a2))) :
                      pipe(l, Chunk.map((a) => f(a, Chunk.unsafeLast(r))))
                  ),
                  concat(
                    pipe(
                      repeatEffectOption(left),
                      mergeEither(repeatEffectOption(right)),
                      mapEffectSequential(Either.match({
                        onLeft: (leftChunk) =>
                          pipe(
                            Ref.modify(latest, ([_, rightLatest]) =>
                              [
                                pipe(leftChunk, Chunk.map((a) => f(a, rightLatest))),
                                [Chunk.unsafeLast(leftChunk), rightLatest] as const
                              ] as const)
                          ),
                        onRight: (rightChunk) =>
                          pipe(
                            Ref.modify(latest, ([leftLatest, _]) =>
                              [
                                pipe(rightChunk, Chunk.map((a2) => f(leftLatest, a2))),
                                [leftLatest, Chunk.unsafeLast(rightChunk)] as const
                              ] as const)
                          )
                      })),
                      flatMap(fromChunk)
                    )
                  )
                )
              )
            )
          ),
          toPull
        )
      ),
      fromPull
    )
  }
)

/** @internal */
export const zipLeft = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A> =>
    pipe(
      self,
      zipWithChunks(that, (left, right) => {
        if (left.length > right.length) {
          return [
            pipe(left, Chunk.take(right.length)),
            Either.left(pipe(left, Chunk.take(right.length)))
          ] as const
        }
        return [
          left,
          Either.right(pipe(right, Chunk.drop(left.length)))
        ]
      })
    )
)

/** @internal */
export const zipRight = dual<
  <R2, E2, A2>(
    that: Stream.Stream<R2, E2, A2>
  ) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A2>,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ) => Stream.Stream<R2 | R, E2 | E, A2>
>(
  2,
  <R, E, A, R2, E2, A2>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>
  ): Stream.Stream<R | R2, E | E2, A2> =>
    pipe(
      self,
      zipWithChunks(that, (left, right) => {
        if (left.length > right.length) {
          return [
            right,
            Either.left(pipe(left, Chunk.take(right.length)))
          ] as const
        }
        return [
          pipe(right, Chunk.take(left.length)),
          Either.right(pipe(right, Chunk.drop(left.length)))
        ]
      })
    )
)

/** @internal */
export const zipWith = dual<
  <R2, E2, A2, A, A3>(
    that: Stream.Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A3>,
  <R, E, R2, E2, A2, A, A3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ) => Stream.Stream<R2 | R, E2 | E, A3>
>(
  3,
  <R, E, R2, E2, A2, A, A3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): Stream.Stream<R | R2, E | E2, A3> =>
    pipe(self, zipWithChunks(that, (leftChunk, rightChunk) => zipChunks(leftChunk, rightChunk, f)))
)

/** @internal */
export const zipWithChunks = dual<
  <R2, E2, A2, A, A3>(
    that: Stream.Stream<R2, E2, A2>,
    f: (
      left: Chunk.Chunk<A>,
      right: Chunk.Chunk<A2>
    ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
  ) => <R, E>(self: Stream.Stream<R, E, A>) => Stream.Stream<R2 | R, E2 | E, A3>,
  <R, E, R2, E2, A2, A, A3>(
    self: Stream.Stream<R, E, A>,
    that: Stream.Stream<R2, E2, A2>,
    f: (
      left: Chunk.Chunk<A>,
      right: Chunk.Chunk<A2>
    ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
  ) => Stream.Stream<R2 | R, E2 | E, A3>
>(3, <R, E, R2, E2, A2, A, A3>(
  self: Stream.Stream<R, E, A>,
  that: Stream.Stream<R2, E2, A2>,
  f: (
    left: Chunk.Chunk<A>,
    right: Chunk.Chunk<A2>
  ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
): Stream.Stream<R | R2, E | E2, A3> => {
  const pull = (
    state: ZipChunksState.ZipChunksState<A, A2>,
    pullLeft: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>,
    pullRight: Effect.Effect<R2, Option.Option<E2>, Chunk.Chunk<A2>>
  ): Effect.Effect<
    R | R2,
    never,
    Exit.Exit<Option.Option<E | E2>, readonly [Chunk.Chunk<A3>, ZipChunksState.ZipChunksState<A, A2>]>
  > => {
    switch (state._tag) {
      case ZipChunksState.OP_PULL_BOTH: {
        return pipe(
          unsome(pullLeft),
          Effect.zip(unsome(pullRight), { concurrent: true }),
          Effect.matchEffect({
            onFailure: (error) => Effect.succeed(Exit.fail(Option.some(error))),
            onSuccess: ([leftOption, rightOption]) => {
              if (Option.isSome(leftOption) && Option.isSome(rightOption)) {
                if (Chunk.isEmpty(leftOption.value) && Chunk.isEmpty(rightOption.value)) {
                  return pull(ZipChunksState.PullBoth, pullLeft, pullRight)
                }
                if (Chunk.isEmpty(leftOption.value)) {
                  return pull(ZipChunksState.PullLeft(rightOption.value), pullLeft, pullRight)
                }
                if (Chunk.isEmpty(rightOption.value)) {
                  return pull(ZipChunksState.PullRight(leftOption.value), pullLeft, pullRight)
                }
                return Effect.succeed(Exit.succeed(zip(leftOption.value, rightOption.value)))
              }
              return Effect.succeed(Exit.fail(Option.none()))
            }
          })
        )
      }
      case ZipChunksState.OP_PULL_LEFT: {
        return Effect.matchEffect(pullLeft, {
          onFailure: (error) => Effect.succeed(Exit.fail(error)),
          onSuccess: (leftChunk) => {
            if (Chunk.isEmpty(leftChunk)) {
              return pull(ZipChunksState.PullLeft(state.rightChunk), pullLeft, pullRight)
            }
            if (Chunk.isEmpty(state.rightChunk)) {
              return pull(ZipChunksState.PullRight(leftChunk), pullLeft, pullRight)
            }
            return Effect.succeed(Exit.succeed(zip(leftChunk, state.rightChunk)))
          }
        })
      }
      case ZipChunksState.OP_PULL_RIGHT: {
        return Effect.matchEffect(pullRight, {
          onFailure: (error) => Effect.succeed(Exit.fail(error)),
          onSuccess: (rightChunk) => {
            if (Chunk.isEmpty(rightChunk)) {
              return pull(ZipChunksState.PullRight(state.leftChunk), pullLeft, pullRight)
            }
            if (Chunk.isEmpty(state.leftChunk)) {
              return pull(ZipChunksState.PullLeft(rightChunk), pullLeft, pullRight)
            }
            return Effect.succeed(Exit.succeed(zip(state.leftChunk, rightChunk)))
          }
        })
      }
    }
  }
  const zip = (
    leftChunk: Chunk.Chunk<A>,
    rightChunk: Chunk.Chunk<A2>
  ): readonly [Chunk.Chunk<A3>, ZipChunksState.ZipChunksState<A, A2>] => {
    const [output, either] = f(leftChunk, rightChunk)
    switch (either._tag) {
      case "Left": {
        if (Chunk.isEmpty(either.left)) {
          return [output, ZipChunksState.PullBoth] as const
        }
        return [output, ZipChunksState.PullRight(either.left)] as const
      }
      case "Right": {
        if (Chunk.isEmpty(either.right)) {
          return [output, ZipChunksState.PullBoth] as const
        }
        return [output, ZipChunksState.PullLeft(either.right)] as const
      }
    }
  }
  return pipe(
    self,
    combineChunks(that, ZipChunksState.PullBoth, pull)
  )
})

/** @internal */
export const zipWithIndex = <R, E, A>(self: Stream.Stream<R, E, A>): Stream.Stream<R, E, [A, number]> =>
  pipe(self, mapAccum(0, (index, a) => [index + 1, [a, index]]))

/** @internal */
export const zipWithNext = <R, E, A>(
  self: Stream.Stream<R, E, A>
): Stream.Stream<R, E, [A, Option.Option<A>]> => {
  const process = (
    last: Option.Option<A>
  ): Channel.Channel<never, never, Chunk.Chunk<A>, unknown, never, Chunk.Chunk<readonly [A, Option.Option<A>]>, void> =>
    core.readWithCause({
      onInput: (input: Chunk.Chunk<A>) => {
        const [newLast, chunk] = Chunk.mapAccum(
          input,
          last,
          (prev, curr) => [Option.some(curr), pipe(prev, Option.map((a) => [a, curr] as const))] as const
        )
        const output = Chunk.filterMap(
          chunk,
          (option) =>
            Option.isSome(option) ?
              Option.some([option.value[0], Option.some(option.value[1])] as const) :
              Option.none()
        )
        return core.flatMap(
          core.write(output),
          () => process(newLast)
        )
      },
      onFailure: core.failCause,
      onDone: () =>
        Option.match(last, {
          onNone: () => core.unit,
          onSome: (value) =>
            channel.zipRight(
              core.write(Chunk.of<readonly [A, Option.Option<A>]>([value, Option.none()])),
              core.unit
            )
        })
    })
  return new StreamImpl(pipe(toChannel(self), channel.pipeToOrFail(process(Option.none()))))
}

/** @internal */
export const zipWithPrevious = <R, E, A>(
  self: Stream.Stream<R, E, A>
): Stream.Stream<R, E, [Option.Option<A>, A]> =>
  pipe(
    self,
    mapAccum<Option.Option<A>, A, [Option.Option<A>, A]>(
      Option.none(),
      (prev, curr) => [Option.some(curr), [prev, curr]]
    )
  )

/** @internal */
export const zipWithPreviousAndNext = <R, E, A>(
  self: Stream.Stream<R, E, A>
): Stream.Stream<R, E, [Option.Option<A>, A, Option.Option<A>]> =>
  pipe(
    zipWithNext(zipWithPrevious(self)),
    map(([[prev, curr], next]) => [prev, curr, pipe(next, Option.map((tuple) => tuple[1]))])
  )

/** @internal */
const zipChunks = <A, B, C>(
  left: Chunk.Chunk<A>,
  right: Chunk.Chunk<B>,
  f: (a: A, b: B) => C
): [Chunk.Chunk<C>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<B>>] => {
  if (left.length > right.length) {
    return [
      pipe(left, Chunk.take(right.length), Chunk.zipWith(right, f)),
      Either.left(pipe(left, Chunk.drop(right.length)))
    ]
  }
  return [
    pipe(left, Chunk.zipWith(pipe(right, Chunk.take(left.length)), f)),
    Either.right(pipe(right, Chunk.drop(left.length)))
  ]
}

// Do notation

/** @internal */
export const Do: Stream.Stream<never, never, {}> = succeed({})

/** @internal */
export const bind = dual<
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Stream.Stream<R2, E2, A>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ) => <R, E>(self: Stream.Stream<R, E, K>) => Stream.Stream<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, N extends string, K, R2, E2, A>(
    self: Stream.Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Stream.Stream<R2, E2, A>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
    }
  ) => Stream.Stream<
    R | R2,
    E | E2,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>((args) => typeof args[0] !== "string", <R, E, N extends string, K, R2, E2, A>(
  self: Stream.Stream<R, E, K>,
  tag: Exclude<N, keyof K>,
  f: (_: K) => Stream.Stream<R2, E2, A>,
  options?: {
    readonly concurrency?: number | "unbounded" | undefined
    readonly bufferSize?: number | undefined
  }
) =>
  flatMap(self, (k) =>
    map(
      f(k),
      (a): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: a } as any)
    ), options))

/* @internal */
export const bindTo = dual<
  <N extends string>(tag: N) => <R, E, A>(self: Stream.Stream<R, E, A>) => Stream.Stream<
    R,
    E,
    Record<N, A>
  >,
  <R, E, A, N extends string>(
    self: Stream.Stream<R, E, A>,
    tag: N
  ) => Stream.Stream<
    R,
    E,
    Record<N, A>
  >
>(
  2,
  <R, E, A, N extends string>(self: Stream.Stream<R, E, A>, tag: N): Stream.Stream<R, E, Record<N, A>> =>
    map(self, (a) => ({ [tag]: a } as Record<N, A>))
)

/* @internal */
export const let_ = dual<
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => <R, E>(self: Stream.Stream<R, E, K>) => Stream.Stream<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >,
  <R, E, K, N extends string, A>(
    self: Stream.Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ) => Stream.Stream<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
>(3, <R, E, K, N extends string, A>(self: Stream.Stream<R, E, K>, tag: Exclude<N, keyof K>, f: (_: K) => A) =>
  map(
    self,
    (k): Effect.MergeRecord<K, { [k in N]: A }> => ({ ...k, [tag]: f(k) } as any)
  ))

// Circular with Channel

/** @internal */
export const channelToStream = <Env, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, unknown, unknown, unknown, OutErr, Chunk.Chunk<OutElem>, OutDone>
): Stream.Stream<Env, OutErr, OutElem> => {
  return new StreamImpl(self)
}

// =============================================================================
// encoding
// =============================================================================

/** @internal */
export const decodeText = dual<
  (encoding?: string) => <R, E>(self: Stream.Stream<R, E, Uint8Array>) => Stream.Stream<R, E, string>,
  <R, E>(self: Stream.Stream<R, E, Uint8Array>, encoding?: string) => Stream.Stream<R, E, string>
>((args) => isStream(args[0]), (self, encoding = "utf-8") =>
  suspend(() => {
    const decoder = new TextDecoder(encoding)
    return map(self, (s) => decoder.decode(s))
  }))

/** @internal */
export const encodeText = <R, E>(self: Stream.Stream<R, E, string>): Stream.Stream<R, E, Uint8Array> =>
  suspend(() => {
    const encoder = new TextEncoder()
    return map(self, (s) => encoder.encode(s))
  })
