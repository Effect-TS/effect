import type { Array } from "../../../collection/immutable/Array"
import type { NonEmptyArray } from "../../../collection/immutable/NonEmptyArray"
import * as NA from "../../../collection/immutable/NonEmptyArray"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Duration } from "../../../data/Duration"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * A schedule that recurs once for each of the specified durations, delaying
 * each time for the length of the specified duration. Returns the length of
 * the current duration between recurrences.
 *
 * @tsplus static ets/ScheduleOps fromDurations
 */
export function fromDurations(
  duration: Duration,
  ...durations: Array<Duration>
): Schedule.WithState<
  Tuple<[NonEmptyArray<Duration>, boolean]>,
  unknown,
  unknown,
  Duration
> {
  return makeWithState(
    Tuple(NA.prepend_(durations, duration), true as boolean),
    (now, input, { tuple: [durations, cont] }) =>
      Effect.succeed(() => {
        if (cont) {
          const interval = Interval.after(now + NA.head(durations).milliseconds)
          const x = durations[0]

          if (durations.length >= 2) {
            const y = durations[1]!
            const z = durations.slice(2)
            return Tuple(Tuple(NA.prepend_(z, y), true), x, Decision.Continue(interval))
          }

          const y = durations.slice(1)

          return Tuple(Tuple(NA.prepend_(y, x), false), x, Decision.Continue(interval))
        }

        return Tuple(Tuple(durations, false), Duration.Zero, Decision.Done)
      })
  )
}
