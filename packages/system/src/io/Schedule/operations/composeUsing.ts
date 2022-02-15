import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Schedule } from "../definition"

/**
 * A backwards version of `compose`.
 *
 * @tsplus operator ets/Schedule <<
 * @tsplus operator ets/ScheduleWithState <<
 * @tsplus fluent ets/Schedule composeUsing
 * @tsplus fluent ets/ScheduleWithState composeUsing
 */
export function composeUsing_<State, Env, In, Out, State1, Env1, In2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In2, In>
): Schedule.WithState<Tuple<[State1, State]>, Env & Env1, In2, Out> {
  return that >> self
}

/**
 * A backwards version of `compose`.
 *
 * @ets_data_first composeUsing_
 */
export function composeUsing<State1, Env1, In2, In>(
  that: Schedule.WithState<State1, Env1, In2, In>
) {
  return <State, Env, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State1, State]>, Env & Env1, In2, Out> => self << that
}
