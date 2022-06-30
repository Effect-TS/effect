import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * A schedule that always recurs, which returns inputs as outputs.
 *
 * @tsplus static effect/core/io/Schedule.Ops identity
 */
export function identity<A>(): Schedule<void, never, A, A> {
  return makeWithState(
    undefined as void,
    (now, input, state) => Effect.succeed(Tuple(state, input, Decision.Continue(Interval.after(now))))
  )
}
