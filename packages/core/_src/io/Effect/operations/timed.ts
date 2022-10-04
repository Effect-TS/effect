/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @tsplus getter effect/core/io/Effect timed
 */
export function timed<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, E, readonly [Duration, A]> {
  return self.timedWith(Clock.currentTime)
}
