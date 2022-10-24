import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import {
  beginningOfDay,
  endOfDay,
  nextDay
} from "@effect/core/io/Schedule/operations/_internal/time"

/**
 * Cron-like schedule that recurs every specified `day` of each week. It
 * triggers at zero hour of the week. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `day` parameter is validated lazily. Must be in range 1 (Monday)...7
 * (Sunday).
 *
 * @tsplus static effect/core/io/Schedule.Ops dayOfWeek
 * @category constructors
 * @since 1.0.0
 */
export function dayOfWeek(
  day: number
): Schedule<readonly [number, number], never, unknown, number> {
  return makeWithState(
    [Number.MIN_SAFE_INTEGER, 0] as readonly [number, number],
    (now, _, state) => {
      if (!Number.isInteger(day) || day < 1 || 7 < day) {
        return Effect.dieSync(
          new IllegalArgumentException(
            `Invalid argument in: dayOfWeek(${day}). Must be in range 1 (Monday)...7 (Sunday)`
          )
        )
      }
      const [end0, n] = state
      const now0 = Math.max(end0, now)
      const day0 = nextDay(now0, day)
      const start = Math.max(beginningOfDay(day0), now0)
      const end = endOfDay(day0)
      const interval = Interval(start, end)
      return Effect.succeed([[end, n + 1] as const, n, Decision.continueWith(interval)] as const)
    }
  )
}
