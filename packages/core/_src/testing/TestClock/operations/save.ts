/**
 * Accesses a `TestClock` instance in the environment and saves the clock
 * state in an effect which, when run, will restore the `TestClock` to the
 * saved state.
 *
 * @tsplus static effect/core/testing/TestClock.Ops save
 */
export const save: Effect<never, never, Effect<never, never, void>> = TestClock.testClockWith(
  (testClock) => testClock.save
)
