/**
 * Returns a new schedule that chooses between two schedules with a common
 * output.
 *
 * @tsplus static effect/core/io/Schedule.Aspects chooseMerge
 * @tsplus pipeable effect/core/io/Schedule chooseMerge
 */
export function chooseMerge<State1, Env1, In2, Out2>(
  that: Schedule<State1, Env1, In2, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<readonly [State, State1], Env | Env1, Either<In, In2>, Out | Out2> =>
    (self + that).map((either) => either.merge)
}
