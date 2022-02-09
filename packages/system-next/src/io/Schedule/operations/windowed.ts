import { Tuple } from "../../../collection/immutable/Tuple"
import type { Duration } from "../../../data/Duration"
import { Option } from "../../../data/Option"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

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
): Schedule.WithState<Tuple<[Option<number>, number]>, unknown, unknown, number> {
  const millis = interval.milliseconds
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
