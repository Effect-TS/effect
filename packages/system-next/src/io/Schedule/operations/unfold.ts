import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Unfolds a schedule that repeats one time from the specified state and
 * iterator.
 *
 * @tsplus static ets/ScheduleOps unfold
 */
export function unfold<A>(
  initial: A,
  f: (a: A) => A
): Schedule.WithState<A, unknown, unknown, A> {
  return makeWithState(initial, (now, _, state) =>
    Effect.succeed(Tuple(f(state), state, Decision.Continue(Interval.after(now))))
  )
}
