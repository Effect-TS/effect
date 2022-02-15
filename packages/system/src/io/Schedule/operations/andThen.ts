import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Schedule } from "../definition"

/**
 * The same as `andThenEither`, but merges the output.
 *
 * @tsplus operator ets/Schedule /
 * @tsplus operator ets/ScheduleWithState /
 * @tsplus fluent ets/Schedule andThen
 * @tsplus fluent ets/ScheduleWithState andThen
 */
export function andThen_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>
): Schedule.WithState<
  Tuple<[State, State1, boolean]>,
  Env & Env1,
  In & In1,
  Out | Out2
> {
  return self.andThenEither(that).map((either) => either.merge())
}

/**
 * The same as `andThenEither`, but merges the output.
 *
 * @ets_data_first andThen_
 */
export function andThen<State1, Env1, In1, Out2>(
  that: Schedule.WithState<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<
    Tuple<[State, State1, boolean]>,
    Env & Env1,
    In & In1,
    Out | Out2
  > => self / that
}
