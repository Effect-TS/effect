import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that applies the current one but runs the specified
 * effect for every decision of this schedule. This can be used to create
 * schedules that log failures, decisions, or computed values.
 *
 * @tsplus fluent ets/Schedule onDecision
 * @tsplus fluent ets/Schedule/WithState onDecision
 */
export function onDecision_<State, Env, In, Out, Env1, X>(
  self: Schedule<State, Env, In, Out>,
  f: (state: State, out: Out, decision: Decision) => Effect.RIO<Env1, X>
): Schedule<State, Env | Env1, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, out, decision] }) => f(state, out, decision).as(Tuple(state, out, decision))))
}

/**
 * Returns a new schedule that applies the current one but runs the specified
 * effect for every decision of this schedule. This can be used to create
 * schedules that log failures, decisions, or computed values.
 *
 * @tsplus static ets/Schedule/Aspects onDecision
 */
export const onDecision = Pipeable(onDecision_)
