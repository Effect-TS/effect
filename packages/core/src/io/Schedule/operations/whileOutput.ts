import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Returns a new schedule that continues for as long the specified predicate
 * on the output evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects whileOutput
 * @tsplus pipeable effect/core/io/Schedule whileOutput
 * @category mutations
 * @since 1.0.0
 */
export function whileOutput<Out>(f: Predicate<Out>) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env, In, Out> => self.check((_, out) => f(out))
}
