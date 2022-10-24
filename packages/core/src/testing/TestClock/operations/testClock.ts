/**
 * Retrieves the `TestClock` service for this test.
 *
 * @tsplus static effect/core/testing/TestClock.Ops testClock
 * @category getters
 * @since 1.0.0
 */
export const testClock: Effect<never, never, TestClock> = TestClock.testClockWith(
  Effect.succeed
)
