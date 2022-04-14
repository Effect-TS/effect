/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the input evaluates to true.
 *
 * @tsplus fluent ets/Schedule whileInputEffect
 * @tsplus fluent ets/Schedule/WithState whileInputEffect
 */
export function whileInputEffect_<State, Env, In, Out, Env1>(
  self: Schedule<State, Env, In, Out>,
  f: (input: In) => RIO<Env1, boolean>
): Schedule<State, Env & Env1, In, Out> {
  return self.checkEffect((input, _) => f(input));
}

/**
 * Returns a new schedule that continues for as long the specified effectful
 * predicate on the input evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects whileInputEffect
 */
export const whileInputEffect = Pipeable(whileInputEffect_);
