/**
 * Equivalent to `zip` followed by `map`.
 *
 * @tsplus fluent ets/Schedule zipWith
 * @tsplus fluent ets/Schedule/WithState zipWith
 */
export function zipWith_<State, Env, In, Out, State1, Env1, In1, Out2, Out3>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In1, Out2>,
  f: (out: Out, out2: Out2) => Out3
): Schedule<Tuple<[State, State1]>, Env | Env1, In & In1, Out3> {
  return self.zip(that).map(({ tuple: [out, out2] }) => f(out as Out, out2 as Out2))
}

/**
 * Equivalent to `zip` followed by `map`.
 *
 * @tsplus static ets/Schedule/Aspects zipWith
 */
export const zipWith = Pipeable(zipWith_)
