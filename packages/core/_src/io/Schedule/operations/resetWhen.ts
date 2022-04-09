import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to true.
 *
 * @tsplus fluent ets/Schedule resetWhen
 * @tsplus fluent ets/Schedule/WithState resetWhen
 */
export function resetWhen_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: Predicate<Out>
): Schedule.WithState<State, Env, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, out, decision] }) =>
        f(out)
          ? self._step(now, input, self._initial)
          : Effect.succeedNow(Tuple(state, out, decision))
      ));
}

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to true.
 *
 * @tsplus static ets/Schedule/Aspects resetWhen
 */
export const resetWhen = Pipeable(resetWhen_);
