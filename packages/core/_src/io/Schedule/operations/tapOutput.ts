import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Returns a new schedule that effectfully processes every output from this
 * schedule.
 *
 * @tsplus fluent ets/Schedule tapOutput
 * @tsplus fluent ets/Schedule/WithState tapOutput
 */
export function tapOutput_<State, Env, In, Out, Env1, X>(
  self: Schedule<State, Env, In, Out>,
  f: (out: Out) => RIO<Env1, X>
): Schedule<State, Env & Env1, In, Out> {
  return makeWithState(
    self._initial,
    (now, input, state) => self._step(now, input, state).tap(({ tuple: [, out] }) => f(out))
  );
}

/**
 * Returns a new schedule that effectfully processes every output from this
 * schedule.
 *
 * @tsplus static ets/Schedule/Aspects tapOutput
 */
export const tapOutput = Pipeable(tapOutput_);
