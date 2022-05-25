/**
 * Like `aggregateWithinEither`, but only returns the `Right` results.
 *
 * @param sink Used for the aggregation
 * @param schedule Used for signalling for when to stop the aggregation
 *
 * @tsplus fluent ets/Stream aggregateWithin
 */
export function aggregateWithin_<R, E, A, R2, E2, A2, S, R3, B, C>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A | A2, A2, B>>,
  schedule: LazyArg<Schedule<S, R3, Option<B>, C>>,
  __tsplusTrace?: string
): Stream<R & R2 & R3, E | E2, B> {
  return self.aggregateWithinEither(sink, schedule).collectRight()
}

/**
 * Like `aggregateWithinEither`, but only returns the `Right` results.
 *
 * @param sink Used for the aggregation
 * @param schedule Used for signalling for when to stop the aggregation
 *
 * @tsplus static ets/Stream/Aspects aggregateWithin
 */
export const aggregateWithin = Pipeable(aggregateWithin_)
