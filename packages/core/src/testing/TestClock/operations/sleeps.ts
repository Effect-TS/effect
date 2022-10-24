import type { List } from "@fp-ts/data/List"

/**
 * Accesses a `TestClock` instance in the environment and returns a list of
 * times that effects are scheduled to run.
 *
 * @tsplus static effect/core/testing/TestClock.Ops sleeps
 * @category mutations
 * @since 1.0.0
 */
export const sleeps: Effect<never, never, List<number>> = TestClock.testClockWith(
  (testClock) => testClock.sleeps
)
