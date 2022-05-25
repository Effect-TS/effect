import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import { beginningOfDay, endOfDay, nextDay } from "@effect/core/io/Schedule/operations/_internal/time"

/**
 * Cron-like schedule that recurs every specified `day` of each week. It
 * triggers at zero hour of the week. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `day` parameter is validated lazily. Must be in range 1 (Monday)...7
 * (Sunday).
 *
 * @tsplus static ets/Schedule dayOfWeek
 */
export function dayOfWeek(
  day: number
): Schedule<number, unknown, unknown, number> {
  return makeWithState(0, (now, _, state) => {
    if (!Number.isInteger(day) || day < 0 || 7 < day) {
      return Effect.die(
        new IllegalArgumentException(
          `Invalid argument in: dayOfWeek(${day}). Must be in range 1 (Monday)...7 (Sunday)`
        )
      )
    }
    const d = nextDay(now, day)
    const start = Math.max(beginningOfDay(d), now)
    const end = endOfDay(d)
    const interval = Interval(start, end)
    return Effect.succeedNow(Tuple(state + 1, state, Decision.Continue(interval)))
  })
}
