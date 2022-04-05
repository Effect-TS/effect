/**
 * Returns a new schedule that continues until the specified predicate on the
 * input evaluates to true.
 *
 * @tsplus fluent ets/Schedule untilInput
 * @tsplus fluent ets/Schedule/WithState untilInput
 */
export function untilInput_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: Predicate<In>
): Schedule.WithState<State, Env, In, Out> {
  return self.check((input, _) => !f(input));
}

/**
 * Returns a new schedule that continues until the specified predicate on the
 * input evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects untilInput
 */
export const untilInput = Pipeable(untilInput_);
