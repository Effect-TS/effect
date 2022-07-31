/**
 * Aggregates elements of this stream using the provided sink for as long as
 * the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators
 * upstream of this operator run on one fiber, while downstream operators run
 * on another. Whenever the downstream fiber is busy processing elements, the
 * upstream fiber will feed elements into the sink until it signals
 * completion.
 *
 * Any sink can be used here, but see `Sink.foldWeightedEffect` and
 * `Sink.foldUntilEffect` for sinks that cover the common usecases.
 *
 * @param sink Used for the aggregation
 *
 * @tsplus static effect/core/stream/Stream.Aspects aggregate
 * @tsplus pipeable effect/core/stream/Stream aggregate
 */
export function aggregate<R, E, A, R2, E2, A2, B>(
  sink: LazyArg<Sink<R2, E | E2, A | A2, A2, B>>
) {
  return (self: Stream<R, E, A>): Stream<R | R2, E | E2, B> =>
    self.aggregateWithin(sink, Schedule.recurs(0))
}
