/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @tsplus fluent ets/Effect timed
 */
export function timed<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, Tuple<[Duration, A]>> {
  return self.timedWith(Clock.currentTime)
}
