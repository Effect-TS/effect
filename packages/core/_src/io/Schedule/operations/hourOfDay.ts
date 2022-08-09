import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import {
  beginningOfHour,
  endOfHour,
  nextHour
} from "@effect/core/io/Schedule/operations/_internal/time"

/**
 * Cron-like schedule that recurs every specified `hour` of each day. It
 * triggers at zero minute of the hour. Producing a count of repeats: 0, 1, 2.
 *
 * NOTE: `hour` parameter is validated lazily. Must be in range 0...23.
 *
 * @tsplus static effect/core/io/Schedule.Ops hourOfDay
 */
export function hourOfDay(
  hour: number
): Schedule<Tuple<[number, number]>, never, unknown, number> {
  return makeWithState(Tuple(Number.MIN_SAFE_INTEGER, 0), (now, _, state) => {
    if (!Number.isInteger(hour) || hour < 0 || 23 < hour) {
      return Effect.dieSync(
        new IllegalArgumentException(
          `Invalid argument in: hourOfDay(${hour}). Must be in range 0...23`
        )
      )
    }
    const { tuple: [end0, n] } = state
    const now0 = Math.max(end0, now)
    const hour0 = nextHour(now0, hour)
    const start = Math.max(beginningOfHour(hour0), now0)
    const end = endOfHour(hour0)
    const interval = Interval(start, end)
    return Effect.succeed(Tuple(Tuple(end, n + 1), n, Decision.continueWith(interval)))
  })
}
