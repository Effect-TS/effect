/**
 * @tsplus static effect/core/testing/TestClock.Ops adjustWith
 */
export function adjustWith(duration: LazyArg<Duration>) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    TestClock.testClockWith(
      (testClock) => testClock.adjustWith(duration())(effect)
    )
}
