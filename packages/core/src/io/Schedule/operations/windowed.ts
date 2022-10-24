import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import type { Duration } from "@fp-ts/data/Duration"
import * as Option from "@fp-ts/data/Option"

/**
 * A schedule that divides the timeline to `interval`-long windows, and sleeps
 * until the nearest window boundary every time it recurs.
 *
 * For example, `windowed(Duration.seconds(10))` would produce a schedule as
 * follows:
 *
 * ```text
 *      10s        10s        10s       10s
 * |----------|----------|----------|----------|
 * |action------|sleep---|act|-sleep|action----|
 * ```
 *
 * @tsplus static effect/core/io/Schedule.Ops windowed
 * @category constructors
 * @since 1.0.0
 */
export function windowed(
  interval: Duration
): Schedule<readonly [Option.Option<number>, number], never, unknown, number> {
  const millis = interval.millis
  return makeWithState(
    [Option.none, 0] as readonly [Option.Option<number>, number],
    (now, _, [option, n]) => {
      switch (option._tag) {
        case "None": {
          return Effect.succeed([
            [Option.some(now), n + 1],
            n,
            Decision.continueWith(Interval.after(now + millis))
          ])
        }
        case "Some": {
          return Effect.succeed([
            [Option.some(option.value), n + 1],
            n,
            Decision.continueWith(
              Interval.after(now + (millis - ((now - option.value) % millis)))
            )
          ])
        }
      }
    }
  )
}
