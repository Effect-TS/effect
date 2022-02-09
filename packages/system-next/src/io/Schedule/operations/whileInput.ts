import type { Predicate } from "../../../data/Function"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the input evaluates to true.
 *
 * @tsplus fluent ets/Schedule whileInput
 * @tsplus fluent ets/ScheduleWithState whileInput
 */
export function whileInput_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: Predicate<In>
): Schedule.WithState<State, Env, In, Out> {
  return self.check((input, _) => f(input))
}

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the input evaluates to true.
 *
 * @ets_data_first whileInput_
 */
export function whileInput<In>(f: Predicate<In>) {
  return <State, Env, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.whileInput(f)
}
