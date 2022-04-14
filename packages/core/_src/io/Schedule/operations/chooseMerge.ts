/**
 * Returns a new schedule that chooses between two schedules with a common
 * output.
 *
 * @tsplus operator ets/Schedule ||
 * @tsplus operator ets/Schedule/WithState ||
 * @tsplus fluent ets/Schedule chooseMerge
 * @tsplus fluent ets/Schedule/WithState chooseMerge
 */
export function chooseMerge_<State, Env, In, Out, State1, Env1, In2, Out2>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In2, Out2>
): Schedule<Tuple<[State, State1]>, Env & Env1, Either<In, In2>, Out | Out2> {
  return (self + that).map((either) => either.merge());
}

/**
 * Returns a new schedule that chooses between two schedules with a common
 * output.
 *
 * @tsplus static ets/Schedule/Aspects chooseMerge
 */
export const chooseMerge = Pipeable(chooseMerge_);
