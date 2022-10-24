/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the output evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects whileOutputEffect
 * @tsplus pipeable effect/core/io/Schedule whileOutputEffect
 * @category mutations
 * @since 1.0.0
 */
export function whileOutputEffect<Out, Env1>(
  f: (out: Out) => Effect<Env1, never, boolean>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> => self.checkEffect((_, out) => f(out))
}
