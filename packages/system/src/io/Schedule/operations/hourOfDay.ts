import { Tuple } from "../../../collection/immutable/Tuple"
import { IllegalArgumentException } from "../../Cause"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"
import { beginningOfHour, endOfHour, nextHour } from "./_internal/time"

/**
 * Cron-like schedule that recurs every specified `hour` of each day. It
 * triggers at zero minute of the hour. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `hour` parameter is validated lazily. Must be in range 0...23.
 *
 * @tsplus static ets/Schedule hourOfDay
 */
export function hourOfDay(
  hour: number
): Schedule.WithState<number, unknown, unknown, number> {
  return makeWithState(0, (now, _, state) => {
    if (!Number.isInteger(hour) || hour < 0 || 23 < hour) {
      return Effect.die(
        new IllegalArgumentException(
          `Invalid argument in: hourOfDay(${hour}). Must be in range 0...23`
        )
      )
    }
    const hr = nextHour(now, hour)
    const start = Math.max(beginningOfHour(hr), now)
    const end = endOfHour(hr)
    const interval = Interval(start, end)
    return Effect.succeedNow(Tuple(state + 1, state, Decision.Continue(interval)))
  })
}
