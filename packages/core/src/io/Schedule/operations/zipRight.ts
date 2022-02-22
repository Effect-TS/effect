import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Schedule } from "../definition"

/**
 * The same as `intersect` but ignores the left output.
 *
 * @tsplus operator ets/Schedule >
 * @tsplus operator ets/ScheduleWithState >
 * @tsplus fluent ets/Schedule zipRight
 * @tsplus fluent ets/ScheduleWithState zipRight
 */
export function zipRight_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>
): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In & In1, Out2> {
  return (self && that).map((out) => out.get(1) as Out2) // TODO(Mike/Max): can we avoid typecasting?
}

/**
 * The same as `intersect` but ignores the left output.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<State1, Env1, In1, Out2>(
  that: Schedule.WithState<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In & In1, Out2> =>
    self > that
}
