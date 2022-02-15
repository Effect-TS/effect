import { Schedule } from "../definition"

/**
 * A schedule that always recurs, producing a count of repeats: 0, 1, 2.
 *
 * @tsplus static ets/ScheduleOps forever
 */
export const repeatForever: Schedule.WithState<number, unknown, unknown, number> =
  Schedule.unfold(0, (n) => n + 1)
