import { Tuple } from "../../../collection/immutable/Tuple"
import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified effectful function.
 *
 * @tsplus fluent ets/Schedule mapEffect
 * @tsplus fluent ets/ScheduleWithState mapEffect
 */
export function mapEffect_<State, Env, In, Out, Env1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out) => RIO<Env1, Out2>
): Schedule.WithState<State, Env & Env1, In, Out2> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, out, decision] }) =>
        f(out).map((out2) => Tuple(state, out2, decision))
      )
  )
}

/**
 * Returns a new schedule that maps the output of this schedule through the
 * specified effectful function.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<Env1, Out, Out2>(f: (out: Out) => RIO<Env1, Out2>) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In, Out2> => self.mapEffect(f)
}
