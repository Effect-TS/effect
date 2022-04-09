/**
 * The same as `intersect` but ignores the right output.
 *
 * @tsplus operator ets/Schedule <
 * @tsplus operator ets/Schedule/WithState <
 * @tsplus fluent ets/Schedule zipLeft
 * @tsplus fluent ets/Schedule/WithState zipLeft
 */
export function zipLeft_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>
): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In & In1, Out> {
  return (self && that).map((out) => out.get(0) as Out);
}

/**
 * The same as `intersect` but ignores the left output.
 *
 * @tsplus static ets/Schedule/Aspects zipLeft
 */
export const zipLeft = Pipeable(zipLeft_);
