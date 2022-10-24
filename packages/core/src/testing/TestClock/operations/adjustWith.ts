import type { Duration } from "@fp-ts/data/Duration"

/**
 * @tsplus static effect/core/testing/TestClock.Ops adjustWith
 * @category mutations
 * @since 1.0.0
 */
export function adjustWith(duration: Duration) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    TestClock.testClockWith((testClock) => testClock.adjustWith(duration)(effect))
}
