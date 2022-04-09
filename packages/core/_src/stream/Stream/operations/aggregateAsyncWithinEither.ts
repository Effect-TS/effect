import type { Driver } from "@effect/core/io/Schedule/Driver";
import type { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal";
import { concreteSink } from "@effect/core/stream/Sink/operations/_internal/SinkInternal";
import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff";
import { HandoffSignal } from "@effect/core/stream/Stream/operations/_internal/HandoffSignal";
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";
import { SinkEndReason } from "@effect/core/stream/Stream/SinkEndReason";

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
 * @tsplus fluent ets/Stream aggregateAsyncWithinEither
 */
export function aggregateAsyncWithinEither_<R, E, A, R2, E2, A2, S, R3, B, C>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A | A2, A2, B>>,
  schedule: LazyArg<Schedule.WithState<S, R3, Option<B>, C>>,
  __tsplusTrace?: string
): Stream<R & R2 & R3 & HasClock, E | E2, Either<C, B>>;
export function aggregateAsyncWithinEither_<R, E, A, R2, E2, A2, R3, B, C>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E | E2, A | A2, A2, B>>,
  schedule: LazyArg<Schedule<R3, Option<B>, C>>,
  __tsplusTrace?: string
): Stream<R & R2 & R3 & HasClock, E | E2, Either<C, B>> {
  type EndReason = SinkEndReason<C>;
  type Signal = HandoffSignal<C, E | E2, A>;

  return Stream.fromEffect(
    Effect.tuple(
      Handoff.make<Signal>(),
      Ref.make<EndReason>(SinkEndReason.SinkEnd),
      Ref.make(Chunk.empty<A2>()),
      schedule().driver()
    )
  ).flatMap(({ tuple: [handoff, sinkEndReason, sinkLeftovers, scheduleDriver] }) => {
    const handoffProducer: Channel<
      unknown,
      E | E2,
      Chunk<A>,
      unknown,
      never,
      never,
      unknown
    > = Channel.readWithCause(
      (input: Chunk<A>) => Channel.fromEffect(handoff.offer(HandoffSignal.Emit(input))) > handoffProducer,
      (cause) => Channel.fromEffect(handoff.offer(HandoffSignal.Halt(cause))),
      () => Channel.fromEffect(handoff.offer(HandoffSignal.End(SinkEndReason.UpstreamEnd)))
    );

    const handoffConsumer: Channel<
      unknown,
      unknown,
      unknown,
      unknown,
      E | E2,
      Chunk<A | A2>,
      void
    > = Channel.unwrap(
      sinkLeftovers.getAndSet(Chunk.empty<A | A2>()).flatMap((leftovers) =>
        leftovers.isNonEmpty()
          ? Effect.succeed(Channel.write(leftovers) > handoffConsumer)
          : handoff.take().map((signal) => {
            switch (signal._tag) {
              case "Emit": {
                return Channel.write(signal.elements) > handoffConsumer;
              }
              case "Halt": {
                return Channel.failCause(signal.error);
              }
              case "End": {
                return Channel.fromEffect(sinkEndReason.set(signal.reason));
              }
            }
          })
      )
    );

    const sink0 = sink();
    concreteStream(self);
    concreteSink(sink0);
    return Stream.scoped(
      (self.channel >> handoffProducer).runScoped().fork()
    ).crossRight(
      new StreamInternal(
        scheduledAggregator(
          sink0,
          handoff,
          scheduleDriver,
          sinkEndReason,
          sinkLeftovers,
          handoffProducer,
          handoffConsumer,
          Option.none
        )
      )
    );
  });
}

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
 * @tsplus static ets/Stream/Aspects aggregateAsyncWithinEither
 */
export const aggregateAsyncWithinEither = Pipeable(aggregateAsyncWithinEither_);

function scheduledAggregator<S, R2, R3, E2, A, A2, B, C>(
  sink: SinkInternal<R2, E2, A | A2, A2, B>,
  handoff: Handoff<HandoffSignal<C, E2, A>>,
  scheduleDriver: Driver<S, R3, Option<B>, C>,
  sinkEndReason: Ref<SinkEndReason<C>>,
  sinkLeftovers: Ref<Chunk<A2>>,
  handoffProducer: Channel<unknown, E2, Chunk<A>, unknown, never, never, unknown>,
  handoffConsumer: Channel<unknown, unknown, unknown, unknown, E2, Chunk<A | A2>, void>,
  lastB: Option<B>,
  __tsplusTrace?: string
): Channel<
  R2 & R3 & HasClock,
  unknown,
  unknown,
  unknown,
  E2,
  Chunk<Either<C, B>>,
  unknown
> {
  const timeout = scheduleDriver.next(lastB).foldCauseEffect(
    (cause) =>
      cause.failureOrCause().fold(
        () => handoff.offer(HandoffSignal.End(SinkEndReason.ScheduleTimeout)),
        (cause) => handoff.offer(HandoffSignal.Halt(cause))
      ),
    (c) => handoff.offer(HandoffSignal.End(SinkEndReason.ScheduleEnd(c)))
  );
  return Channel.scoped(timeout.forkScoped(), (fiber) =>
    handoffConsumer
      .pipeToOrFail(sink.channel)
      .doneCollect()
      .flatMap(
        ({ tuple: [leftovers, b] }) =>
          Channel.fromEffect(
            fiber.interrupt() > sinkLeftovers.set(leftovers.flatten())
          ) >
            Channel.unwrap(
              sinkEndReason.modify((reason) => {
                switch (reason._tag) {
                  case "ScheduleEnd": {
                    return Tuple(
                      Channel.write(Chunk(Either.right(b), Either.left(reason.c))).as(
                        Option.some(b)
                      ),
                      SinkEndReason.SinkEnd
                    );
                  }
                  case "ScheduleTimeout": {
                    return Tuple(
                      Channel.write(Chunk.single(Either.right(b))).as(Option.some(b)),
                      SinkEndReason.SinkEnd
                    );
                  }
                  case "SinkEnd": {
                    return Tuple(
                      Channel.write(Chunk.single(Either.right(b))).as(Option.some(b)),
                      SinkEndReason.SinkEnd
                    );
                  }
                  case "UpstreamEnd": {
                    return Tuple(
                      Channel.write(Chunk.single(Either.right(b))).as(Option.none),
                      SinkEndReason.UpstreamEnd
                    );
                  }
                }
              })
            )
      )).flatMap((option: Option<B>) =>
      option.isSome()
        ? scheduledAggregator(
          sink,
          handoff,
          scheduleDriver,
          sinkEndReason,
          sinkLeftovers,
          handoffProducer,
          handoffConsumer,
          option
        )
        : Channel.unit
    );
}
