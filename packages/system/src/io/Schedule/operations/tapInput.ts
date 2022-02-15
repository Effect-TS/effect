import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that effectfully processes every input to this
 * schedule.
 *
 * @tsplus fluent ets/Schedule tapInput
 * @tsplus fluent ets/ScheduleWithState tapInput
 */
export function tapInput_<State, Env, In, Out, Env1, In1, X>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (in1: In1) => RIO<Env1, X>
): Schedule.WithState<State, Env & Env1, In & In1, Out> {
  return makeWithState(
    self._initial,
    (now, input, state) => f(input) > self._step(now, input, state)
  )
}

/**
 * Returns a new schedule that effectfully processes every input to this
 * schedule.
 *
 * @ets_data_first tapInput_
 */
export function tapInput<Env1, In1, X>(f: (in1: In1) => RIO<Env1, X>) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In & In1, Out> => self.tapInput(f)
}
