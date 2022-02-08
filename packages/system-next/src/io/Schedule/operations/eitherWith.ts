import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Schedule } from "../definition"

/**
 * The same as `either` followed by `map`.
 *
 * @tsplus fluent ets/Schedule eitherWith
 * @tsplus fluent ets/ScheduleWithState eitherWith
 */
export function eitherWith_<State, Env, In, Out, State1, Env1, In1, Out2, Out3>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>,
  f: (out: Out, out2: Out2) => Out3
): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In & In1, Out3> {
  return (self | that).map(({ tuple: [out, out2] }) => f(out as Out, out2 as Out2)) // TODO(Mike/Max)
}

/**
 * The same as `either` followed by `map`.
 *
 * @ets_data_first eitherWith_
 */
export function eitherWith<State1, Env1, In1, Out, Out2, Out3>(
  that: Schedule.WithState<State1, Env1, In1, Out2>,
  f: (out: Out, out2: Out2) => Out3
) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In & In1, Out3> =>
    self.eitherWith(that, f)
}
