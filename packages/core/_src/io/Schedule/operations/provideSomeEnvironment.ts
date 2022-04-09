import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Transforms the environment being provided to this schedule with the
 * specified function.
 *
 * @tsplus fluent ets/Schedule provideSomeEnvironment
 * @tsplus fluent ets/Schedule/WithState provideSomeEnvironment
 */
export function provideSomeEnvironment_<State, Env0, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (env0: Env0) => Env
): Schedule.WithState<State, Env0, In, Out> {
  return makeWithState(self._initial, (now, input, state) => self._step(now, input, state).provideSomeEnvironment(f));
}

/**
 * Transforms the environment being provided to this schedule with the
 * specified function.
 *
 * @tsplus static ets/Schedule/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_);
