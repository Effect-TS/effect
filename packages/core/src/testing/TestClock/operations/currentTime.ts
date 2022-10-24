/**
 * Accesses the current time of a `TestClock` instance in the environment in
 * milliseconds.
 *
 * @tsplus static effect/core/testing/TestClock.Ops currentTime
 * @category getters
 * @since 1.0.0
 */
export const currentTime: Effect<never, never, number> = TestClock.testClockWith(
  (testClock) => testClock.currentTime
)
