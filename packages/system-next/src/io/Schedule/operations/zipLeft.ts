import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Schedule } from "../definition"

/**
 * The same as `intersect` but ignores the right output.
 *
 * @tsplus operator ets/Schedule <
 * @tsplus operator ets/ScheduleWithState <
 * @tsplus fluent ets/Schedule zipLeft
 * @tsplus fluent ets/ScheduleWithState zipLeft
 */
export function zipLeft_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>
): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In & In1, Out> {
  return (self && that).map((out) => out.get(0) as Out) // TODO(Mike/Max): can we avoid typecasting?
}

/**
 * The same as `intersect` but ignores the left output.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<State1, Env1, In1, Out2>(
  that: Schedule.WithState<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In & In1, Out> =>
    self < that
}
