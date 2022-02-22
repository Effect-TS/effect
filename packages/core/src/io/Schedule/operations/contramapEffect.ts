import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @tsplus fluent ets/Schedule contramapEffect
 * @tsplus fluent ets/ScheduleWithState contramapEffect
 */
export function contramapEffect_<State, Env, In, Out, Env1, In2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (in2: In2) => RIO<Env1, In>
): Schedule.WithState<State, Env & Env1, In2, Out> {
  return makeWithState(self._initial, (now, input2, state) =>
    f(input2).flatMap((input) => self._step(now, input, state))
  )
}

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @ets_data_first contramapEffect_
 */
export function contramapEffect<In2, Env1, In>(f: (in2: In2) => RIO<Env1, In>) {
  return <State, Env, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In2, Out> => self.contramapEffect(f)
}
