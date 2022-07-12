/**
 * Retrieves the `TestClock` service for this test.
 *
 * @tsplus static effect/core/testing/TestClock.Ops testClock
 */
export const testClock: Effect<never, never, TestClock> = TestClock.testClockWith(
  Effect.succeedNow
)
