import type { Schedule } from "../definition"

/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @tsplus fluent ets/Schedule dimap
 * @tsplus fluent ets/ScheduleWithState dimap
 */
export function dimap_<State, Env, In, Out, In2, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (in2: In2) => In,
  g: (out: Out) => Out2
): Schedule.WithState<State, Env, In2, Out2> {
  return self.contramap(f).map(g)
}

/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @ets_data_first dimap_
 */
export function dimap<In, In2, Out, Out2>(f: (in2: In2) => In, g: (out: Out) => Out2) {
  return <State, Env>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In2, Out2> => self.dimap(f, g)
}
