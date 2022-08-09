import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import {
  beginningOfSecond,
  endOfSecond,
  nextSecond
} from "@effect/core/io/Schedule/operations/_internal/time"

/**
 * Cron-like schedule that recurs every specified `second` of each minute. It
 * triggers at zero nanosecond of the second. Producing a count of repeats: 0,
 * 1, 2.
 *
 * NOTE: `second` parameter is validated lazily. Must be in range 0...59.
 *
 * @tsplus static effect/core/io/Schedule.Ops secondOfMinute
 */
export function secondOfMinute(
  second: number
): Schedule<Tuple<[number, number]>, never, unknown, number> {
  return makeWithState(Tuple(Number.MIN_SAFE_INTEGER, 0), (now, _, state) => {
    if (!Number.isInteger(second) || second < 0 || 59 < second) {
      return Effect.dieSync(
        new IllegalArgumentException(
          `Invalid argument in: secondOfMinute(${second}). Must be in range 0...59`
        )
      )
    }
    const { tuple: [end0, n] } = state
    const now0 = Math.max(end0, now)
    const second0 = nextSecond(now0, second)
    const start = Math.max(beginningOfSecond(second0), now0)
    const end = endOfSecond(second0)
    const interval = Interval(start, end)
    return Effect.succeed(Tuple(Tuple(end, n + 1), n, Decision.continueWith(interval)))
  })
}
