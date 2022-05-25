/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the output evaluates to true.
 *
 * @tsplus fluent ets/Schedule whileOutputEffect
 * @tsplus fluent ets/Schedule/WithState whileOutputEffect
 */
export function whileOutputEffect_<State, Env, In, Out, Env1>(
  self: Schedule<State, Env, In, Out>,
  f: (out: Out) => Effect.RIO<Env1, boolean>
): Schedule<State, Env & Env1, In, Out> {
  return self.checkEffect((_, out) => f(out))
}

/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the output evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects whileOutputEffect
 */
export const whileOutputEffect = Pipeable(whileOutputEffect_)
