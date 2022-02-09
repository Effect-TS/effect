import type { LazyArg } from "../../../data/Function"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that maps this schedule to a constant output.
 *
 * @tsplus fluent ets/Schedule as
 * @tsplus fluent ets/ScheduleWithState as
 */
export function as_<State, Env, In, Out, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  out2: LazyArg<Out2>
): Schedule.WithState<State, Env, In, Out2> {
  return self.map(out2)
}

/**
 * Returns a new schedule that maps this schedule to a constant output.
 *
 * @ets_data_first as_
 */
export function as<Out2>(out2: LazyArg<Out2>) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out2> => self.as(out2)
}
