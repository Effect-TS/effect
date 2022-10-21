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
 */
export function aggregateWithinEither<A, R2, E2, A2, S, R3, B, C>(
  sink: Sink<R2, E2, A | A2, A2, B>,
  schedule: Schedule<S, R3, Maybe<B>, C>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2 | R3, E | E2, Either<C, B>> => {
    type EndReason = SinkEndReason
    type Signal = HandoffSignal<E | E2, A>

    return Stream.fromEffect(
      Effect.tuple(
        Handoff.make<Signal>(),
        Ref.make<EndReason>(SinkEndReason.ScheduleEnd),
        Ref.make(Chunk.empty<A | A2>()),
        schedule.driver,
        Ref.make(false)
      )
    ).flatMap(([handoff, sinkEndReason, sinkLeftovers, scheduleDriver, consumed]) => {
      const handoffProducer: Channel<
        never,
        E | E2,
        Chunk<A>,
        unknown,
        never,
        never,
        unknown
      > = Channel.readWithCause(
        (input: Chunk<A>) =>
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
        Chunk<A | A2>,
        void
      > = Channel.unwrap(
        sinkLeftovers.getAndSet(Chunk.empty<A | A2>()).flatMap((leftovers) =>
          leftovers.isNonEmpty
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
                    Chunk<A | A2>,
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
        const scheduleFiber = $(timeout(scheduleDriver, Maybe.none).forkScoped)
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
  scheduleDriver: Driver<S, R, Maybe<A>, B>,
  last: Maybe<A>
): Effect<R, Maybe<never>, B> {
  return scheduleDriver.next(last)
}

function handleSide<S, R, R2, E, A, A2, B, C>(
  sink: SinkInternal<R, E, A | A2, A2, B>,
  handoff: Handoff<HandoffSignal<E, A>>,
  sinkEndReason: Ref<SinkEndReason>,
  sinkLeftovers: Ref<Chunk<A | A2>>,
  scheduleDriver: Driver<S, R2, Maybe<B>, C>,
  consumed: Ref<boolean>,
  handoffProducer: Channel<never, E, Chunk<A>, unknown, never, never, unknown>,
  handoffConsumer: Channel<never, unknown, unknown, unknown, E, Chunk<A | A2>, void>,
  forkSink: Effect<Scope | R, never, Fiber.Runtime<E, readonly [Chunk<Chunk<A2>>, B]>>,
  leftovers: Chunk<Chunk<A | A2>>,
  b: B,
  c: Maybe<C>
): Channel<
  R | R2,
  unknown,
  unknown,
  unknown,
  E,
  Chunk<Either<C, B>>,
  unknown
> {
  return Channel.unwrap(
    sinkLeftovers.set(leftovers.flatten) >
      sinkEndReason.get.map((reason) => {
        switch (reason._tag) {
          case "ScheduleEnd": {
            return Channel.unwrapScoped(
              Do(($) => {
                const isConsumed = $(consumed.get)
                const sinkFiber = $(forkSink)
                const scheduleFiber = $(timeout(scheduleDriver, Maybe.some(b)).forkScoped)
                const toWrite = c.fold(
                  Chunk.single(Either.right(b)),
                  (c) => Chunk(Either.right(b), Either.left(c))
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
}

function scheduledAggregator<S, R2, R3, E2, A, A2, B, C>(
  sink: SinkInternal<R2, E2, A | A2, A2, B>,
  handoff: Handoff<HandoffSignal<E2, A>>,
  sinkEndReason: Ref<SinkEndReason>,
  sinkLeftovers: Ref<Chunk<A2>>,
  scheduleDriver: Driver<S, R3, Maybe<B>, C>,
  consumed: Ref<boolean>,
  handoffProducer: Channel<never, E2, Chunk<A>, unknown, never, never, unknown>,
  handoffConsumer: Channel<never, unknown, unknown, unknown, E2, Chunk<A | A2>, void>,
  sinkFiber: Fiber.Runtime<E2, readonly [Chunk<Chunk<A | A2>>, B]>,
  scheduleFiber: Fiber.Runtime<Maybe<never>, C>
): Channel<
  R2 | R3,
  unknown,
  unknown,
  unknown,
  E2,
  Chunk<Either<C, B>>,
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
              Maybe.none
            )
          ),
      (scheduleExit, sinkFiber) =>
        Effect.done(scheduleExit).foldCauseEffect(
          (cause) =>
            cause.failureOrCause.fold(
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
                        Maybe.none
                      )
                    )
                  ),
              (cause) =>
                handoff.offer(HandoffSignal.Halt(cause)).forkDaemon >
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
                      Maybe.none
                    )
                  )
            ),
          (c) =>
            handoff.offer(HandoffSignal.End(SinkEndReason.ScheduleEnd)).forkDaemon >
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
                  Maybe.some(c)
                )
              )
        )
    )
  )
}
