import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import {
  beginningOfDay,
  endOfDay,
  nextDayOfMonth
} from "@effect/core/io/Schedule/operations/_internal/time"

/**
 * Cron-like schedule that recurs every specified `day` of month. Won't recur
 * on months containing less days than specified in `day` param.
 *
 * It triggers at zero hour of the day. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `day` parameter is validated lazily. Must be in range 1...31.
 *
 * @tsplus static effect/core/io/Schedule.Ops dayOfMonth
 */
export function dayOfMonth(
  day: number
): Schedule<Tuple<[number, number]>, never, unknown, number> {
  return makeWithState(Tuple(Number.MIN_SAFE_INTEGER, 0), (now, _, state) => {
    if (!Number.isInteger(day) || day < 1 || 31 < day) {
      return Effect.die(
        new IllegalArgumentException(
          `Invalid argument in: dayOfMonth(${day}). Must be in range 1...31`
        )
      )
    }
    const { tuple: [end0, n] } = state
    const now0 = Math.max(end0, now)
    const day0 = nextDayOfMonth(now0, day)
    const start = Math.max(beginningOfDay(day0), now0)
    const end = endOfDay(day0)
    const interval = Interval(start, end)
    return Effect.succeed(Tuple(Tuple(end, n + 1), n, Decision.continueWith(interval)))
  })
}
