import type { Duration } from "../../../data/Duration"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @tsplus fluent ets/Schedule delayed
 * @tsplus fluent ets/ScheduleWithState delayed
 */
export function delayed_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (duration: Duration) => Duration
): Schedule.WithState<State, Env, In, Out> {
  return self.delayedEffect((duration) => Effect.succeed(f(duration)))
}

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @ets_data_first delayed_
 */
export function delayed(f: (duration: Duration) => Duration) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.delayed(f)
}
