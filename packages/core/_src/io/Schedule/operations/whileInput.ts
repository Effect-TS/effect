/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the input evaluates to true.
 *
 * @tsplus fluent ets/Schedule whileInput
 * @tsplus fluent ets/Schedule/WithState whileInput
 */
export function whileInput_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  f: Predicate<In>
): Schedule<State, Env, In, Out> {
  return self.check((input, _) => f(input))
}

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the input evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects whileInput
 */
export const whileInput = Pipeable(whileInput_)
