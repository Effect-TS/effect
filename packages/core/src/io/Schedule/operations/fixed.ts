import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import * as Duration from "@fp-ts/data/Duration"
import * as Equal from "@fp-ts/data/Equal"
import * as Option from "@fp-ts/data/Option"

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * ```text
 * |-----interval-----|-----interval-----|-----interval-----|
 * |---------action--------||action|-----|action|-----------|
 * ```
 *
 * @tsplus static effect/core/io/Schedule.Ops fixed
 * @category constructors
 * @since 1.0.0
 */
export function fixed(
  interval: Duration.Duration
): Schedule<
  readonly [Option.Option<readonly [number, number]>, number],
  never,
  unknown,
  number
> {
  return makeWithState(
    [Option.none, 0] as readonly [Option.Option<readonly [number, number]>, number],
    (now, _, [option, n]) =>
      Effect.sync(() => {
        const intervalMillis = interval.millis
        switch (option._tag) {
          case "None": {
            return [
              [Option.some([now, now + intervalMillis] as const), n + 1] as const,
              n,
              Decision.continueWith(Interval.after(now + intervalMillis))
            ] as const
          }
          case "Some": {
            const [startMillis, lastRun] = option.value
            const runningBehind = now > (lastRun + intervalMillis)
            const boundary = Equal.equals(interval, Duration.zero)
              ? interval
              : Duration.millis(intervalMillis - ((now - startMillis) % intervalMillis))
            const sleepTime = Equal.equals(boundary, Duration.zero) ? interval : boundary
            const nextRun = runningBehind ? now : now + sleepTime.millis
            return [
              [Option.some([startMillis, nextRun] as const), n + 1] as const,
              n,
              Decision.continueWith(Interval.after(nextRun))
            ] as const
          }
        }
      })
  )
}
