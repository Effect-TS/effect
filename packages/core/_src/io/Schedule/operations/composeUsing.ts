/**
 * A backwards version of `compose`.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule <<
 * @tsplus static effect/core/io/Schedule.Aspects composeUsing
 * @tsplus pipeable effect/core/io/Schedule composeUsing
 */
export function composeUsing<State1, Env1, In2, In>(
  that: Schedule<State1, Env1, In2, In>
) {
  return <State, Env, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<readonly [State1, State], Env | Env1, In2, Out> => that >> self
}
