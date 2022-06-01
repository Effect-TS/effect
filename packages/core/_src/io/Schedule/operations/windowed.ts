import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

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
 */
export function windowed(
  interval: Duration
): Schedule<Tuple<[Option<number>, number]>, never, unknown, number> {
  const millis = interval.millis
  return makeWithState(
    Tuple(Option.emptyOf(), 0),
    (now, input, { tuple: [option, n] }) =>
      Effect.succeed(
        option.fold(
          () =>
            Tuple(
              Tuple(Option.some(now), n + 1),
              n,
              Decision.Continue(Interval.after(now + millis))
            ),
          (startMillis) =>
            Tuple(
              Tuple(Option.some(startMillis), n + 1),
              n,
              Decision.Continue(
                Interval.after(now + (millis - ((now - startMillis) % millis)))
              )
            )
        )
      )
  )
}
