/**
 * Returns an effect that is delayed from this effect by the specified
 * `Duration`.
 *
 * @tsplus fluent ets/Effect delay
 */
export function delay_<R, E, A>(
  self: Effect<R, E, A>,
  duration: Duration,
  __tsplusTrace?: string
): Effect<R & HasClock, E, A> {
  return Clock.sleep(duration) > self;
}

/**
 * Returns an effect that is delayed from this effect by the specified
 * `Duration`.
 *
 * @tsplus static ets/Effect/Aspects delay
 */
export const delay = Pipeable(delay_);
