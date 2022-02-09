import type { Duration } from "packages/system-next/src/data/Duration"

import type { Schedule } from "../definition"

/**
 * Takes a schedule that produces a delay, and returns a new schedule that
 * uses this delay to further delay intervals in the resulting schedule.
 *
 * @tsplus static ets/ScheduleOps delayed
 */
export function delayedUsing<State, Env, In>(
  schedule: Schedule.WithState<State, Env, In, Duration>
): Schedule.WithState<State, Env, In, Duration> {
  return schedule.addDelay((x) => x)
}
