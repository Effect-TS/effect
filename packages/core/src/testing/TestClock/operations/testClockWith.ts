/**
 * Retrieves the `TestClock` service for this test and uses it to run the
 * specified workflow.
 *
 * @tsplus static effect/core/testing/TestClock.Ops testClockWith
 */
export function testClockWith<R, E, A>(
  f: (testClock: TestClock) => Effect<R, E, A>
): Effect<R, E, A> {
  return DefaultServices.currentServices.getWith((services) =>
    f(services.get(Clock.Tag) as TestClock)
  )
}
