/**
 * Returns a new schedule that continues until the specified predicate on the
 * output evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects untilOutput
 * @tsplus pipeable effect/core/io/Schedule untilOutput
 */
export function untilOutput<Out>(f: Predicate<Out>) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env, In, Out> => self.check((_, out) => !f(out))
}
