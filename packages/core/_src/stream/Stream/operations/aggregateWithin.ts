/**
 * Like `aggregateWithinEither`, but only returns the `Right` results.
 *
 * @param sink Used for the aggregation
 * @param schedule Used for signalling for when to stop the aggregation
 *
 * @tsplus static effect/core/stream/Stream.Aspects aggregateWithin
 * @tsplus pipeable effect/core/stream/Stream aggregateWithin
 */
export function aggregateWithin<A, R2, E2, A2, S, R3, B, C>(
  sink: LazyArg<Sink<R2, E2, A | A2, A2, B>>,
  schedule: LazyArg<Schedule<S, R3, Maybe<B>, C>>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2 | R3, E | E2, B> =>
    self.aggregateWithinEither(sink, schedule).collectRight
}
