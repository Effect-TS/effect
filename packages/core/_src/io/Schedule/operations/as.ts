/**
 * Returns a new schedule that maps this schedule to a constant output.
 *
 * @tsplus fluent ets/Schedule as
 * @tsplus fluent ets/Schedule/WithState as
 */
export function as_<State, Env, In, Out, Out2>(
  self: Schedule<State, Env, In, Out>,
  out2: LazyArg<Out2>
): Schedule<State, Env, In, Out2> {
  return self.map(out2);
}

/**
 * Returns a new schedule that maps this schedule to a constant output.
 *
 * @tsplus static ets/Schedule/Aspects as
 */
export const as = Pipeable(as_);
