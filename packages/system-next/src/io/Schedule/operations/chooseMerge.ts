import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Either } from "../../../data/Either"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that chooses between two schedules with a common
 * output.
 *
 * @tsplus operator ets/Schedule ||
 * @tsplus operator ets/ScheduleWithState ||
 * @tsplus fluent ets/Schedule chooseMerge
 * @tsplus fluent ets/ScheduleWithState chooseMerge
 */
export function chooseMerge_<State, Env, In, Out, State1, Env1, In2, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In2, Out2>
): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, Either<In, In2>, Out | Out2> {
  return (self + that).map((either) => either.merge())
}

/**
 * Returns a new schedule that chooses between two schedules with a common
 * output.
 *
 * @ets_data_first chooseMerge_
 */
export function chooseMerge<State1, Env1, In2, Out2>(
  that: Schedule.WithState<State1, Env1, In2, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<
    Tuple<[State, State1]>,
    Env & Env1,
    Either<In, In2>,
    Out | Out2
  > => self || that
}
