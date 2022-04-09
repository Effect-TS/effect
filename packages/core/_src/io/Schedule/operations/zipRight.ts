/**
 * The same as `intersect` but ignores the left output.
 *
 * @tsplus operator ets/Schedule >
 * @tsplus operator ets/Schedule/WithState >
 * @tsplus fluent ets/Schedule zipRight
 * @tsplus fluent ets/Schedule/WithState zipRight
 */
export function zipRight_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>
): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In & In1, Out2> {
  return (self && that).map((out) => out.get(1) as Out2);
}

/**
 * The same as `intersect` but ignores the left output.
 *
 * @tsplus static ets/Schedule/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_);
