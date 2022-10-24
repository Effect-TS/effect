import type { Driver } from "@effect/core/io/Schedule/Driver"
import type { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
import { HandoffSignal } from "@effect/core/stream/Stream/operations/_internal/HandoffSignal"
import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { SinkEndReason } from "@effect/core/stream/Stream/SinkEndReason"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Either from "@fp-ts/data/Either"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Aggregates elements using the provided sink until it completes, or until
 * the delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators
 * upstream of this operator run on one fiber, while downstream operators run
 * on another. Elements will be aggregated by the sink until the downstream
 * fiber pulls the aggregated value, or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays
 * between pulls.
 *
 * @param sink Used for the aggregation
 * @param schedule Used for signalling for when to stop the aggregation
 *
 * @tsplus static effect/core/stream/Stream.Aspects aggregateWithinEither
 * @tsplus pipeable effect/core/stream/Stream aggregateWithinEither
 * @category aggregating
 * @since 1.0.0
 */
export function aggregateWithinEither<A, R2, E2, A2, S, R3, B, C>(
  sink: Sink<R2, E2, A | A2, A2, B>,
  schedule: Schedule<S, R3, Option.Option<B>, C>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2 | R3, E | E2, Either.Either<C, B>> => {
    type EndReason = SinkEndReason
    type Signal = HandoffSignal<E | E2, A>

    return Stream.fromEffect(
      Effect.tuple(
        Handoff.make<Signal>(),
        Ref.make<EndReason>(SinkEndReason.ScheduleEnd),
        Ref.make(Chunk.empty as Chunk.Chunk<A | A2>),
        schedule.driver,
        Ref.make(false)
      )
    ).flatMap(([handoff, sinkEndReason, sinkLeftovers, scheduleDriver, consumed]) => {
      const handoffProducer: Channel<
        never,
        E | E2,
        Chunk.Chunk<A>,
        unknown,
        never,
        never,
        unknown
      > = Channel.readWithCause(
        (input: Chunk.Chunk<A>) =>
          Channel.fromEffect(handoff.offer(HandoffSignal.Emit(input))).flatMap(() =>
            handoffProducer
          ),
        (cause) => Channel.fromEffect(handoff.offer(HandoffSignal.Halt(cause))),
        () => Channel.fromEffect(handoff.offer(HandoffSignal.End(SinkEndReason.UpstreamEnd)))
      )

      const handoffConsumer: Channel<
        never,
        unknown,
        unknown,
        unknown,
        E | E2,
        Chunk.Chunk<A | A2>,
        void
      > = Channel.unwrap(
        sinkLeftovers.getAndSet(Chunk.empty as Chunk.Chunk<A | A2>).flatMap((leftovers) =>
          Chunk.isNonEmpty(leftovers)
            ? consumed.set(true)
              .zipRight(Effect.sync(Channel.write(leftovers).flatMap(() => handoffConsumer)))
            : handoff.take.map((signal) => {
              switch (signal._tag) {
                case "Emit": {
                  return Channel.fromEffect(consumed.set(true))
                    .zipRight(Channel.write(signal.elements))
                    .flatMap(() => handoffConsumer)
                }
                case "Halt": {
                  return Channel.failCause(signal.error)
                }
                case "End": {
                  return (
                    signal.reason._tag === "ScheduleEnd" ?
                      consumed.get.map((p) =>
                        p ?
                          Channel.fromEffect(sinkEndReason.set(SinkEndReason.ScheduleEnd)) :
                          Channel.fromEffect(sinkEndReason.set(SinkEndReason.ScheduleEnd))
                            .flatMap(() => handoffConsumer)
                      ) :
                      Channel.fromEffect(sinkEndReason.set(signal.reason))
                  ) as Channel<
                    never,
                    unknown,
                    unknown,
                    unknown,
                    E | E2,
                    Chunk.Chunk<A | A2>,
                    void
                  >
                }
              }
            })
        )
      )

      concreteStream(self)
      concreteSink(sink)
      const stream = Do(($) => {
        $(self.channel.pipeTo(handoffProducer).runScoped.forkScoped)
        const sinkFiber = $(
          handoffConsumer.pipeToOrFail(sink.channel).doneCollect.runScoped.forkScoped
        )
        const scheduleFiber = $(timeout(scheduleDriver, Option.none).forkScoped)
        return new StreamInternal(
          scheduledAggregator(
            sink,
            handoff,
            sinkEndReason,
            sinkLeftovers,
            scheduleDriver,
            consumed,
            handoffProducer,
            handoffConsumer,
            sinkFiber,
            scheduleFiber
          )
        )
      })
      return Stream.unwrapScoped(stream)
    })
  }
}

function timeout<S, R, A, B>(
  scheduleDriver: Driver<S, R, Option.Option<A>, B>,
  last: Option.Option<A>
): Effect<R, Option.Option<never>, B> {
  return scheduleDriver.next(last)
}

function handleSide<S, R, R2, E, A, A2, B, C>(
  sink: SinkInternal<R, E, A | A2, A2, B>,
  handoff: Handoff<HandoffSignal<E, A>>,
  sinkEndReason: Ref<SinkEndReason>,
  sinkLeftovers: Ref<Chunk.Chunk<A | A2>>,
  scheduleDriver: Driver<S, R2, Option.Option<B>, C>,
  consumed: Ref<boolean>,
  handoffProducer: Channel<never, E, Chunk.Chunk<A>, unknown, never, never, unknown>,
  handoffConsumer: Channel<never, unknown, unknown, unknown, E, Chunk.Chunk<A | A2>, void>,
  forkSink: Effect<Scope | R, never, Fiber.Runtime<E, readonly [Chunk.Chunk<Chunk.Chunk<A2>>, B]>>,
  leftovers: Chunk.Chunk<Chunk.Chunk<A | A2>>,
  b: B,
  c: Option.Option<C>
): Channel<
  R | R2,
  unknown,
  unknown,
  unknown,
  E,
  Chunk.Chunk<Either.Either<C, B>>,
  unknown
> {
  return Channel.unwrap(
    sinkLeftovers.set(Chunk.flatten(leftovers)).zipRight(
      sinkEndReason.get.map((reason) => {
        switch (reason._tag) {
          case "ScheduleEnd": {
            return Channel.unwrapScoped(
              Do(($) => {
                const isConsumed = $(consumed.get)
                const sinkFiber = $(forkSink)
                const scheduleFiber = $(timeout(scheduleDriver, Option.some(b)).forkScoped)
                const toWrite = pipe(
                  c,
                  Option.match(
                    () => Chunk.single(Either.right(b)),
                    (c) => Chunk.make(Either.right(b), Either.left(c))
                  )
                )
                return isConsumed ?
                  Channel.write(toWrite).flatMap(() =>
                    scheduledAggregator(
                      sink,
                      handoff,
                      sinkEndReason,
                      sinkLeftovers,
                      scheduleDriver,
                      consumed,
                      handoffProducer,
                      handoffConsumer,
                      sinkFiber,
                      scheduleFiber
                    )
                  ) :
                  scheduledAggregator(
                    sink,
                    handoff,
                    sinkEndReason,
                    sinkLeftovers,
                    scheduleDriver,
                    consumed,
                    handoffProducer,
                    handoffConsumer,
                    sinkFiber,
                    scheduleFiber
                  )
              })
            )
          }
          case "UpstreamEnd": {
            return Channel.unwrap(
              consumed.get.map((p) =>
                p ? Channel.write(Chunk.single(Either.right(b))) : Channel.unit
              )
            )
          }
        }
      })
    )
  )
}

function scheduledAggregator<S, R2, R3, E2, A, A2, B, C>(
  sink: SinkInternal<R2, E2, A | A2, A2, B>,
  handoff: Handoff<HandoffSignal<E2, A>>,
  sinkEndReason: Ref<SinkEndReason>,
  sinkLeftovers: Ref<Chunk.Chunk<A2>>,
  scheduleDriver: Driver<S, R3, Option.Option<B>, C>,
  consumed: Ref<boolean>,
  handoffProducer: Channel<never, E2, Chunk.Chunk<A>, unknown, never, never, unknown>,
  handoffConsumer: Channel<never, unknown, unknown, unknown, E2, Chunk.Chunk<A | A2>, void>,
  sinkFiber: Fiber.Runtime<E2, readonly [Chunk.Chunk<Chunk.Chunk<A | A2>>, B]>,
  scheduleFiber: Fiber.Runtime<Option.Option<never>, C>
): Channel<
  R2 | R3,
  unknown,
  unknown,
  unknown,
  E2,
  Chunk.Chunk<Either.Either<C, B>>,
  unknown
> {
  concreteSink(sink)

  const forkSink = consumed.set(false).zipRight(
    handoffConsumer
      .pipeToOrFail(sink.channel)
      .doneCollect
      .runScoped
      .forkScoped
  )

  return Channel.unwrap(
    sinkFiber.join.raceWith(
      scheduleFiber.join,
      (sinkExit, scheduleFiber) =>
        scheduleFiber.interrupt >
          Effect.done(sinkExit).map(([leftovers, b]) =>
            handleSide(
              sink,
              handoff,
              sinkEndReason,
              sinkLeftovers,
              scheduleDriver,
              consumed,
              handoffProducer,
              handoffConsumer,
              forkSink,
              leftovers,
              b,
              Option.none
            )
          ),
      (scheduleExit, sinkFiber) =>
        Effect.done(scheduleExit).foldCauseEffect(
          (cause) =>
            pipe(
              cause.failureOrCause,
              Either.match(
                () =>
                  handoff.offer(HandoffSignal.End(SinkEndReason.ScheduleEnd)).forkDaemon
                    .zipRight(
                      sinkFiber.join.map(([leftovers, b]) =>
                        handleSide(
                          sink,
                          handoff,
                          sinkEndReason,
                          sinkLeftovers,
                          scheduleDriver,
                          consumed,
                          handoffProducer,
                          handoffConsumer,
                          forkSink,
                          leftovers,
                          b,
                          Option.none
                        )
                      )
                    ),
                (cause) =>
                  handoff.offer(HandoffSignal.Halt(cause)).forkDaemon.zipRight(
                    sinkFiber.join.map(([leftovers, b]) =>
                      handleSide(
                        sink,
                        handoff,
                        sinkEndReason,
                        sinkLeftovers,
                        scheduleDriver,
                        consumed,
                        handoffProducer,
                        handoffConsumer,
                        forkSink,
                        leftovers,
                        b,
                        Option.none
                      )
                    )
                  )
              )
            ),
          (c) =>
            handoff.offer(HandoffSignal.End(SinkEndReason.ScheduleEnd)).forkDaemon.zipRight(
              sinkFiber.join.map(([leftovers, b]) =>
                handleSide(
                  sink,
                  handoff,
                  sinkEndReason,
                  sinkLeftovers,
                  scheduleDriver,
                  consumed,
                  handoffProducer,
                  handoffConsumer,
                  forkSink,
                  leftovers,
                  b,
                  Option.some(c)
                )
              )
            )
        )
    )
  )
}
