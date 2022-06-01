/**
 * The same as `andThenEither`, but merges the output.
 *
 * @tsplus operator ets/Schedule /
 * @tsplus operator ets/Schedule/WithState /
 * @tsplus fluent ets/Schedule andThen
 * @tsplus fluent ets/Schedule/WithState andThen
 */
export function andThen_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In1, Out2>
): Schedule<
  Tuple<[State, State1, boolean]>,
  Env | Env1,
  In & In1,
  Out | Out2
> {
  return self.andThenEither(that).map((either) => either.merge())
}

/**
 * The same as `andThenEither`, but merges the output.
 *
 * @tsplus static ets/Schedule/Aspects andThen
 */
export const andThen = Pipeable(andThen_)
