import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Duration } from "../../../data/Duration"
import type { Option } from "../../../data/Option"
import { Schedule } from "../definition"

/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus fluent ets/Schedule upTo
 * @tsplus fluent ets/ScheduleWithState upTo
 */
export function upTo_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  duration: Duration
): Schedule.WithState<Tuple<[State, Option<number>]>, Env, In, Out> {
  return self < Schedule.upTo(duration)
}

/**
 * A schedule that recurs during the given duration.
 *
 * @ets_data_first upTo_
 */
export function upTo(duration: Duration) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State, Option<number>]>, Env, In, Out> =>
    self.upTo(duration)
}
