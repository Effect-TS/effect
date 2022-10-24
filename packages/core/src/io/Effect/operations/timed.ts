import type { Duration } from "@fp-ts/data/Duration"

/**
 * Returns a new effect that executes this one and times the execution.
 *
 * @tsplus getter effect/core/io/Effect timed
 * @category mutations
 * @since 1.0.0
 */
export function timed<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, E, readonly [Duration, A]> {
  return self.timedWith(Clock.currentTime)
}
