/**
 * The same as `either` followed by `map`.
 *
 * @tsplus static effect/core/io/Schedule.Aspects eitherWith
 * @tsplus pipeable effect/core/io/Schedule eitherWith
 */
export function eitherWith<State1, Env1, In1, Out2, Out, Out3>(
  that: Schedule<State1, Env1, In1, Out2>,
  f: (out: Out, out2: Out2) => Out3
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<Tuple<[State, State1]>, Env | Env1, In & In1, Out3> =>
    (self | that).map(({ tuple: [out, out2] }) => f(out as Out, out2 as Out2))
}
