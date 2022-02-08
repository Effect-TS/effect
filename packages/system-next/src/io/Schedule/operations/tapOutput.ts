import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that effectfully processes every output from this
 * schedule.
 *
 * @tsplus fluent ets/Schedule tapOutput
 * @tsplus fluent ets/ScheduleWithState tapOutput
 */
export function tapOutput_<State, Env, In, Out, Env1, X>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out) => RIO<Env1, X>
): Schedule.WithState<State, Env & Env1, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self._step(now, input, state).tap(({ tuple: [, out] }) => f(out))
  )
}

/**
 * Returns a new schedule that effectfully processes every output from this
 * schedule.
 *
 * @ets_data_first tapOutput_
 */
export function tapOutput<Env1, Out, X>(f: (out: Out) => RIO<Env1, X>) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In, Out> => self.tapOutput(f)
}
