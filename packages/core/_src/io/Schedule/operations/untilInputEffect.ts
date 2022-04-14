/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the input evaluates to true.
 *
 * @tsplus fluent ets/Schedule untilInputEffect
 * @tsplus fluent ets/Schedule/WithState untilInputEffect
 */
export function untilInputEffect_<State, Env, In, Out, Env1>(
  self: Schedule<State, Env, In, Out>,
  f: (input: In) => Effect.RIO<Env1, boolean>
): Schedule<State, Env & Env1, In, Out> {
  return self.checkEffect((input, _) => f(input).negate());
}

/**
 * Returns a new schedule that continues until the specified effectful
 * predicate on the input evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects untilInputEffect
 */
export const untilInputEffect = Pipeable(untilInputEffect_);
