import type { Duration } from "../../../data/Duration"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule with the given delay added to every interval defined
 * by this schedule.
 *
 * @tsplus fluent ets/Schedule addDelay
 * @tsplus fluent ets/ScheduleWithState addDelay
 */
export function addDelay_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out) => Duration
): Schedule.WithState<State, Env, In, Out> {
  return self.addDelayEffect((out) => Effect.succeed(f(out)))
}

/**
 * Returns a new schedule with the given delay added to every interval defined
 * by this schedule.
 *
 * @ets_data_first addDelay_
 */
export function addDelay<Out>(f: (out: Out) => Duration) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.addDelay(f)
}
