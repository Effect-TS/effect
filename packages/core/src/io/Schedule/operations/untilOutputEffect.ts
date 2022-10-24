/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the output evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects untilOutputEffect
 * @tsplus pipeable effect/core/io/Schedule untilOutputEffect
 * @category mutations
 * @since 1.0.0
 */
export function untilOutputEffect<Out, Env1>(
  f: (out: Out) => Effect<Env1, never, boolean>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> => self.checkEffect((_, out) => f(out).negate)
}
