import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import {
  beginningOfMinute,
  endOfMinute,
  nextMinute
} from "@effect/core/io/Schedule/operations/_internal/time"

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
): Schedule<Tuple<[number, number]>, never, unknown, number> {
  return makeWithState(Tuple(Number.MIN_SAFE_INTEGER, 0), (now, _, state) => {
    if (!Number.isInteger(minute) || minute < 0 || 59 < minute) {
      return Effect.die(
        new IllegalArgumentException(
          `Invalid argument in: minuteOfHour(${minute}). Must be in range 0...59`
        )
      )
    }
    const { tuple: [end0, n] } = state
    const now0 = Math.max(end0, now)
    const minute0 = nextMinute(Math.max(end0, now0), minute)
    const start = Math.max(beginningOfMinute(minute0), now0)
    const end = endOfMinute(minute0)
    const interval = Interval(start, end)
    return Effect.succeed(Tuple(Tuple(end, n + 1), n, Decision.continueWith(interval)))
  })
}
