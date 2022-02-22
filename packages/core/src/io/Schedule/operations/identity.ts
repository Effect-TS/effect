import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * A schedule that always recurs, which returns inputs as outputs.
 *
 * @tsplus static ets/ScheduleOps identity
 */
export function identity<A>(): Schedule.WithState<void, unknown, A, A> {
  return makeWithState(undefined as void, (now, input, state) =>
    Effect.succeed(Tuple(state, input, Decision.Continue(Interval.after(now))))
  )
}
