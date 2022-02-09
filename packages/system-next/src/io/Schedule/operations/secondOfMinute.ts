import { Tuple } from "../../../collection/immutable/Tuple"
import { IllegalArgumentException } from "../../Cause"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"
import { beginningOfSecond, endOfSecond, nextSecond } from "./_internal/time"

/**
 * Cron-like schedule that recurs every specified `second` of each minute. It
 * triggers at zero nanosecond of the second. Producing a count of repeats: 0,
 * 1, 2.
 *
 * NOTE: `second` parameter is validated lazily. Must be in range 0...59.
 *
 * @tsplus static ets/Schedule secondOfMinute
 */
export function secondOfMinute(
  second: number
): Schedule.WithState<number, unknown, unknown, number> {
  return makeWithState(0, (now, _, state) => {
    if (!Number.isInteger(second) || second < 0 || 59 < second) {
      return Effect.die(
        new IllegalArgumentException(
          `Invalid argument in: secondOfMinute(${second}). Must be in range 0...59`
        )
      )
    }
    const sec = nextSecond(now, second)
    const start = Math.max(beginningOfSecond(sec), now)
    const end = endOfSecond(sec)
    const interval = Interval(start, end)
    return Effect.succeedNow(Tuple(state + 1, state, Decision.Continue(interval)))
  })
}
