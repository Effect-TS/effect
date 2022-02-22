import type { HasClock } from "../../Clock"
import { Clock } from "../../Clock"
import type { RIO } from "../../Effect"
import type { Schedule } from "../definition"
import type { Driver } from "../Driver"

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @tsplus fluent ets/Schedule driver
 * @tsplus fluent ets/ScheduleWithState driver
 */
export function driver<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>
): RIO<HasClock, Driver<State, Env, In, Out>> {
  return Clock.driver(self)
}
