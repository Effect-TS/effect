import type { Duration } from "../../../data/Duration"
import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @tsplus fluent ets/Schedule delayedEffect
 * @tsplus fluent ets/ScheduleWithState delayedEffect
 */
export function delayedEffect_<State, Env, In, Out, Env1>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (duration: Duration) => RIO<Env1, Duration>
): Schedule.WithState<State, Env & Env1, In, Out> {
  return self.modifyDelayEffect((_, delay) => f(delay))
}

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @ets_data_first delayedEffect_
 */
export function delayedEffect<Env1>(f: (duration: Duration) => RIO<Env1, Duration>) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In, Out> => self.delayedEffect(f)
}
