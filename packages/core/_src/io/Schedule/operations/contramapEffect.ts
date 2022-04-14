import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @tsplus fluent ets/Schedule contramapEffect
 * @tsplus fluent ets/Schedule/WithState contramapEffect
 */
export function contramapEffect_<State, Env, In, Out, Env1, In2>(
  self: Schedule<State, Env, In, Out>,
  f: (in2: In2) => RIO<Env1, In>
): Schedule<State, Env & Env1, In2, Out> {
  return makeWithState(
    self._initial,
    (now, input2, state) => f(input2).flatMap((input) => self._step(now, input, state))
  );
}

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @tsplus static ets/Schedule/Aspects contramapEffect
 */
export const contramapEffect = Pipeable(contramapEffect_);
