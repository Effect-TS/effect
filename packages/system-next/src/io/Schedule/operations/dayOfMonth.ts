import { Tuple } from "../../../collection/immutable/Tuple"
import { IllegalArgumentException } from "../../Cause"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"
import { beginningOfDay, endOfDay, nextDayOfMonth } from "./_internal/time"

/**
 * Cron-like schedule that recurs every specified `day` of month. Won't recur
 * on months containing less days than specified in `day` param.
 *
 * It triggers at zero hour of the day. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `day` parameter is validated lazily. Must be in range 1...31.
 *
 * @tsplus static ets/Schedule dayOfMonth
 */
export function dayOfMonth(
  day: number
): Schedule.WithState<number, unknown, unknown, number> {
  return makeWithState(0, (now, _, state) => {
    if (!Number.isInteger(day) || day < 1 || 31 < day) {
      return Effect.die(
        new IllegalArgumentException(
          `Invalid argument in: dayOfMonth(${day}). Must be in range 1...31`
        )
      )
    }
    const d = nextDayOfMonth(now, day)
    const start = Math.max(beginningOfDay(d), now)
    const end = endOfDay(d)
    const interval = Interval(start, end)
    return Effect.succeedNow(Tuple(state + 1, state, Decision.Continue(interval)))
  })
}
