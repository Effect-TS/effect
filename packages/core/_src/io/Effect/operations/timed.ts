/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @tsplus fluent ets/Effect timed
 */
export function timed<R, E, A>(self: Effect<R, E, A>, __tsplusTrace?: string) {
  return self.timedWith(Clock.currentTime);
}
