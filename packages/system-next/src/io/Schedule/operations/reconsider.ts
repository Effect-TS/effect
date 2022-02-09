import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Either } from "../../../data/Either"
import { Effect } from "../../Effect"
import type { Decision } from "../Decision"
import type { Schedule } from "../definition"
import type { Interval } from "../Interval"

/**
 * Returns a new schedule that reconsiders every decision made by this
 * schedule, possibly modifying the next interval and the output type in the
 * process.
 *
 * @tsplus fluent ets/Schedule reconsider
 * @tsplus fluent ets/ScheduleWithState reconsider
 */
export function reconsider_<State, Env, In, Out, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (
    state: State,
    out: Out,
    decision: Decision
  ) => Either<Out2, Tuple<[Out2, Interval]>>
): Schedule.WithState<State, Env, In, Out2> {
  return self.reconsiderEffect((state, out, decision) =>
    Effect.succeed(f(state, out, decision))
  )
}

/**
 * Returns a new schedule that reconsiders every decision made by this
 * schedule, possibly modifying the next interval and the output type in the
 * process.
 *
 * @ets_data_first reconsider_
 */
export function reconsider<State, Out, Out2>(
  f: (
    state: State,
    out: Out,
    decision: Decision
  ) => Either<Out2, Tuple<[Out2, Interval]>>
) {
  return <Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out2> => self.reconsider(f)
}
