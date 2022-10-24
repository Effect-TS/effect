/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the input evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects whileInputEffect
 * @tsplus pipeable effect/core/io/Schedule whileInputEffect
 * @category mutations
 * @since 1.0.0
 */
export function whileInputEffect<In, Env1>(
  f: (input: In) => Effect<Env1, never, boolean>
) {
  return <State, Env, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> => self.checkEffect((input, _) => f(input))
}
