/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 *
 * @param sink Used for the aggregation
 * @param schedule Used for signalling for when to stop the aggregation
 *
 * @tsplus fluent ets/Stream aggregateAsyncWithin
 */
export function aggregateAsyncWithin_<R, E, A, R2, E2, A2, S, R3, B, C>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E2, A | A2, A2, B>>,
  schedule: LazyArg<Schedule.WithState<S, R3, Option<B>, C>>,
  __tsplusTrace?: string
): Stream<R & R2 & R3 & HasClock, E | E2, B>;
export function aggregateAsyncWithin_<R, E, A, R2, E2, A2, R3, B, C>(
  self: Stream<R, E, A>,
  sink: LazyArg<Sink<R2, E | E2, A | A2, A2, B>>,
  schedule: LazyArg<Schedule<R3, Option<B>, C>>,
  __tsplusTrace?: string
): Stream<R & R2 & R3 & HasClock, E | E2, B> {
  return self.aggregateAsyncWithinEither(sink, schedule).collectRight();
}

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 *
 * @param sink Used for the aggregation
 * @param schedule Used for signalling for when to stop the aggregation
 *
 * @tsplus static ets/Stream/Aspects aggregateAsyncWithin
 */
export const aggregateAsyncWithin = Pipeable(aggregateAsyncWithin_);
