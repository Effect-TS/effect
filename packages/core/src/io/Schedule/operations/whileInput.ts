import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the input evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects whileInput
 * @tsplus pipeable effect/core/io/Schedule whileInput
 * @category mutations
 * @since 1.0.0
 */
export function whileInput<In>(f: Predicate<In>) {
  return <State, Env, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env, In, Out> => self.check((input, _) => f(input))
}
