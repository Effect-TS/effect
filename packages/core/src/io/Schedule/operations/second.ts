import type { Tuple } from "../../../collection/immutable/Tuple"
import { Schedule } from "../definition"

/**
 * Returns a new schedule that packs the input and output of this schedule
 * into the second element of a tuple. This allows carrying information
 * through this schedule.
 *
 * @tsplus fluent ets/Schedule second
 * @tsplus fluent ets/ScheduleWithState second
 */
export function second<State, Env, In, Out, X>(
  self: Schedule.WithState<State, Env, In, Out>
): Schedule.WithState<Tuple<[void, State]>, Env, Tuple<[X, In]>, Tuple<[X, Out]>> {
  return Schedule.identity<X>() ** self
}
