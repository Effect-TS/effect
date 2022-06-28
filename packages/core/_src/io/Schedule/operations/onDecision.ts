import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that applies the current one but runs the specified
 * effect for every decision of this schedule. This can be used to create
 * schedules that log failures, decisions, or computed values.
 *
 * @tsplus static effect/core/io/Schedule.Aspects onDecision
 * @tsplus pipeable effect/core/io/Schedule onDecision
 */
export function onDecision<State, Out, Env1, X>(
  f: (state: State, out: Out, decision: Decision) => Effect<Env1, never, X>
) {
  return <Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env | Env1, In, Out> =>
    makeWithState(self._initial, (now, input, state) =>
      self
        ._step(now, input, state)
        .flatMap(({ tuple: [state, out, decision] }) => f(state, out, decision).as(Tuple(state, out, decision))))
}
