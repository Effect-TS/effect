import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @tsplus fluent ets/Schedule dimapEffect
 * @tsplus fluent ets/ScheduleWithState dimapEffect
 */
export function dimapEffect_<State, Env, In, Out, Env1, Env2, In2, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (in2: In2) => RIO<Env1, In>,
  g: (out: Out) => RIO<Env2, Out2>
): Schedule.WithState<State, Env & Env1 & Env2, In2, Out2> {
  return self.contramapEffect(f).mapEffect(g)
}

/**
 * Returns a new schedule that contramaps the input and maps the output.
 *
 * @ets_data_first dimapEffect_
 */
export function dimapEffect<Env1, Env2, In, In2, Out, Out2>(
  f: (in2: In2) => RIO<Env1, In>,
  g: (out: Out) => RIO<Env2, Out2>
) {
  return <State, Env>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1 & Env2, In2, Out2> => self.dimapEffect(f, g)
}
