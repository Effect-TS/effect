import { makeWithState } from "@effect-ts/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Returns a new schedule that effectfully processes every input to this
 * schedule.
 *
 * @tsplus fluent ets/Schedule tapInput
 * @tsplus fluent ets/Schedule/WithState tapInput
 */
export function tapInput_<State, Env, In, Out, Env1, In1, X>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (in1: In1) => RIO<Env1, X>
): Schedule.WithState<State, Env & Env1, In & In1, Out> {
  return makeWithState(
    self._initial,
    (now, input, state) => f(input) > self._step(now, input, state)
  );
}

/**
 * Returns a new schedule that effectfully processes every input to this
 * schedule.
 *
 * @tsplus static ets/Schedule/Aspects tapInput
 */
export const tapInput = Pipeable(tapInput_);
