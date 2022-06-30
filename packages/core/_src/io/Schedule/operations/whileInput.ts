/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the input evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects whileInput
 * @tsplus pipeable effect/core/io/Schedule whileInput
 */
export function whileInput<In>(f: Predicate<In>) {
  return <State, Env, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env, In, Out> => self.check((input, _) => f(input))
}
