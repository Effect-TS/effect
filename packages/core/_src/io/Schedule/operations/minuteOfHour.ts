import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import { beginningOfMinute, endOfMinute, nextMinute } from "@effect/core/io/Schedule/operations/_internal/time"

/**
 * Cron-like schedule that recurs every specified `minute` of each hour. It
 * triggers at zero second of the minute. Producing a count of repeats: 0, 1,
 * 2.
 *
 * NOTE: `minute` parameter is validated lazily. Must be in range 0...59.
 *
 * @tsplus static effect/core/io/Schedule.Ops minuteOfHour
 */
export function minuteOfHour(
  minute: number
): Schedule<number, never, unknown, number> {
  return makeWithState(0, (now, _, state) => {
    if (!Number.isInteger(minute) || minute < 0 || 59 < minute) {
      return Effect.die(
        new IllegalArgumentException(
          `Invalid argument in: minuteOfHour(${minute}). Must be in range 0...59`
        )
      )
    }
    const min = nextMinute(now, minute)
    const start = Math.max(beginningOfMinute(min), now)
    const end = endOfMinute(min)
    const interval = Interval(start, end)
    return Effect.succeedNow(Tuple(state + 1, state, Decision.Continue(interval)))
  })
}
