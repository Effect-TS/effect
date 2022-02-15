import type { Predicate } from "../../../data/Function"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that continues until the specified predicate on the
 * input evaluates to true.
 *
 * @tsplus fluent ets/Schedule untilInput
 * @tsplus fluent ets/ScheduleWithState untilInput
 */
export function untilInput_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: Predicate<In>
): Schedule.WithState<State, Env, In, Out> {
  return self.check((input, _) => !f(input))
}

/**
 * Returns a new schedule that continues until the specified predicate on the
 * input evaluates to true.
 *
 * @ets_data_first untilInput_
 */
export function untilInput<In>(f: Predicate<In>) {
  return <State, Env, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.untilInput(f)
}
