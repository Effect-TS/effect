/**
 * Emits elements of this stream with a fixed delay in between, regardless of
 * how long it takes to produce a value.
 *
 * @tsplus fluent ets/Stream fixed
 */
export function fixed_<R, E, A>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R & HasClock, E, A> {
  return self.schedule(Schedule.fixed(duration));
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of
 * how long it takes to produce a value.
 *
 * @tsplus static ets/Stream/Aspects fixed
 */
export const fixed = Pipeable(fixed_);
