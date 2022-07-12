/**
 * Accesses the current time of a `TestClock` instance in the environment in
 * milliseconds.
 *
 * @tsplus static effect/core/testing/TestClock.Ops currentTime
 */
export const currentTime: Effect<never, never, number> = TestClock.testClockWith(
  (testClock) => testClock.currentTime
)
