import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Duration } from "../../../data/Duration"
import type { Option } from "../../../data/Option"
import { Schedule } from "../definition"

/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @tsplus fluent ets/Schedule resetAfter
 * @tsplus fluent ets/ScheduleWithState resetAfter
 */
export function resetAfter_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  duration: Duration
): Schedule.WithState<Tuple<[State, Option<number>]>, Env, In, Out> {
  return self
    .zip(Schedule.elapsed)
    .resetWhen(({ tuple: [, _] }) => (_ as Duration) >= duration)
    .map((out) => out.get(0) as Out)
}

/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @ets_data_first resetAfter_
 */
export function resetAfter(duration: Duration) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State, Option<number>]>, Env, In, Out> =>
    self.resetAfter(duration)
}
