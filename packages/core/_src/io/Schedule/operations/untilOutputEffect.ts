/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the output evaluates to true.
 *
 * @tsplus fluent ets/Schedule untilOutputEffect
 * @tsplus fluent ets/Schedule/WithState untilOutputEffect
 */
export function untilOutputEffect_<State, Env, In, Out, Env1>(
  self: Schedule<State, Env, In, Out>,
  f: (out: Out) => Effect.RIO<Env1, boolean>
): Schedule<State, Env & Env1, In, Out> {
  return self.checkEffect((_, out) => f(out).negate())
}

/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the output evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects untilOutputEffect
 */
export const untilOutputEffect = Pipeable(untilOutputEffect_)
