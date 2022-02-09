import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified function.
 *
 * @tsplus fluent ets/Schedule map
 * @tsplus fluent ets/ScheduleWithState map
 */
export function map<State, Env, In, Out, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out) => Out2
): Schedule.WithState<State, Env, In, Out2> {
  return self.mapEffect((out) => Effect.succeed(f(out)))
}

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified function.
 *
 * @ets_data_first map_
 */
export function map_<Out, Out2>(f: (out: Out) => Out2) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out2> => self.map(f)
}
