/**
 * Returns a new schedule that continues until the specified predicate on the
 * output evaluates to true.
 *
 * @tsplus fluent ets/Schedule untilOutput
 * @tsplus fluent ets/Schedule/WithState untilOutput
 */
export function untilOutput_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  f: Predicate<Out>
): Schedule<State, Env, In, Out> {
  return self.check((_, out) => !f(out));
}

/**
 * Returns a new schedule that continues until the specified predicate on the
 * output evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects untilOutput
 */
export const untilOutput = Pipeable(untilOutput_);
