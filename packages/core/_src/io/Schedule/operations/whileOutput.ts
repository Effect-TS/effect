/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the output evaluates to true.
 *
 * @tsplus fluent ets/Schedule whileOutput
 * @tsplus fluent ets/Schedule/WithState whileOutput
 */
export function whileOutput_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  f: Predicate<Out>
): Schedule<State, Env, In, Out> {
  return self.check((_, out) => f(out))
}

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the output evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects whileOutput
 */
export const whileOutput = Pipeable(whileOutput_)
