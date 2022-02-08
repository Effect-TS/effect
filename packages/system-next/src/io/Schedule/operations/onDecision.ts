import { Tuple } from "../../../collection/immutable/Tuple"
import type { RIO } from "../../Effect"
import type { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that applies the current one but runs the specified
 * effect for every decision of this schedule. This can be used to create
 * schedules that log failures, decisions, or computed values.
 *
 * @tsplus fluent ets/Schedule onDecision
 * @tsplus fluent ets/ScheduleWithState onDecision
 */
export function onDecision_<State, Env, In, Out, Env1, X>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (state: State, out: Out, decision: Decision) => RIO<Env1, X>
): Schedule.WithState<State, Env & Env1, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, out, decision] }) =>
        f(state, out, decision).as(Tuple(state, out, decision))
      )
  )
}

/**
 * Returns a new schedule that applies the current one but runs the specified
 * effect for every decision of this schedule. This can be used to create
 * schedules that log failures, decisions, or computed values.
 *
 * @ets_data_first onDecision_
 */
export function onDecision<State, Out, Env1, X>(
  f: (state: State, out: Out, decision: Decision) => RIO<Env1, X>
) {
  return <In, Env>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In, Out> => self.onDecision(f)
}
