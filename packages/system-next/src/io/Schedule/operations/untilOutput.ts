import type { Predicate } from "../../../data/Function"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that continues until the specified predicate on the
 * output evaluates to true.
 *
 * @tsplus fluent ets/Schedule untilOutput
 * @tsplus fluent ets/ScheduleWithState untilOutput
 */
export function untilOutput_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: Predicate<Out>
): Schedule.WithState<State, Env, In, Out> {
  return self.check((_, out) => !f(out))
}

/**
 * Returns a new schedule that continues until the specified predicate on the
 * output evaluates to true.
 *
 * @ets_data_first untilOutput_
 */
export function untilOutput<Out>(f: Predicate<Out>) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.untilOutput(f)
}
