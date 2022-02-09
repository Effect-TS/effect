import type { Duration } from "../../../data/Duration"
import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule with the given effectfully computed delay added to
 * every interval defined by this schedule.
 *
 * @tsplus fluent ets/Schedule addDelayEffect
 * @tsplus fluent ets/ScheduleWithState addDelayEffect
 */
export function addDelayEffect_<State, Env, In, Out, Env1>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out) => RIO<Env1, Duration>
): Schedule.WithState<State, Env & Env1, In, Out> {
  return self.modifyDelayEffect((out, duration) => f(out).map((_) => duration + _))
}

/**
 * Returns a new schedule with the given effectfully computed delay added to
 * every interval defined by this schedule.
 *
 * @ets_data_first addDelayEffect_
 */
export function addDelayEffect<Env1, Out>(f: (out: Out) => RIO<Env1, Duration>) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In, Out> => self.addDelayEffect(f)
}
