/**
 * The same as `either` followed by `map`.
 *
 * @tsplus fluent ets/Schedule eitherWith
 * @tsplus fluent ets/Schedule/WithState eitherWith
 */
export function eitherWith_<State, Env, In, Out, State1, Env1, In1, Out2, Out3>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In1, Out2>,
  f: (out: Out, out2: Out2) => Out3
): Schedule<Tuple<[State, State1]>, Env & Env1, In & In1, Out3> {
  return (self | that).map(({ tuple: [out, out2] }) => f(out as Out, out2 as Out2));
}

/**
 * The same as `either` followed by `map`.
 *
 * @tsplus static ets/Schedule/Aspects eitherWith
 */
export const eitherWith = Pipeable(eitherWith_);
