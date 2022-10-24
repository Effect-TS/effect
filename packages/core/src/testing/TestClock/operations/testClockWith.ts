import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Retrieves the `TestClock` service for this test and uses it to run the
 * specified workflow.
 *
 * @tsplus static effect/core/testing/TestClock.Ops testClockWith
 * @category getters
 * @since 1.0.0
 */
export function testClockWith<R, E, A>(
  f: (testClock: TestClock) => Effect<R, E, A>
): Effect<R, E, A> {
  return DefaultServices.currentServices.getWith((services) =>
    f(pipe(services, Context.get(Clock.Tag)) as TestClock)
  )
}
