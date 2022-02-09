import type { Duration } from "../../../data/Duration"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 *
 * @tsplus fluent ets/Schedule modifyDelay
 * @tsplus fluent ets/ScheduleWithState modifyDelay
 */
export function modifyDelay_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (out: Out, duration: Duration) => Duration
): Schedule.WithState<State, Env, In, Out> {
  return self.modifyDelayEffect((out, duration) => Effect.succeedNow(f(out, duration)))
}

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 *
 * @ets_data_first modifyDelay_
 */
export function modifyDelay<Out>(f: (out: Out, duration: Duration) => Duration) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.modifyDelay(f)
}
