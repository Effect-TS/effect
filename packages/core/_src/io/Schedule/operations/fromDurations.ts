import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * A schedule that recurs once for each of the specified durations, delaying
 * each time for the length of the specified duration. Returns the length of
 * the current duration between recurrences.
 *
 * @tsplus static effect/core/io/Schedule.Ops fromDurations
 */
export function fromDurations(
  duration: Duration,
  ...durations: Array<Duration>
): Schedule<
  Tuple<[Chunk<Duration>, boolean]>,
  never,
  unknown,
  Duration
> {
  return makeWithState(
    Tuple(Chunk.from([duration, ...durations]), true as boolean),
    (now, _, { tuple: [durations, cont] }) =>
      Effect.succeed(() => {
        if (cont) {
          const x = durations.unsafeGet(0)!
          const interval = Interval.after(now + x.millis)

          if (durations.length >= 2) {
            return Tuple(Tuple(durations.drop(1), true), x, Decision.Continue(interval))
          }

          const y = durations.drop(1)

          return Tuple(Tuple(y.prepend(x), false), x, Decision.Continue(interval))
        }

        return Tuple(Tuple(durations, false), (0).millis, Decision.Done)
      })
  )
}
