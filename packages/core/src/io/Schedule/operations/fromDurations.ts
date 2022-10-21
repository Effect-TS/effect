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
  readonly [Chunk<Duration>, boolean],
  never,
  unknown,
  Duration
> {
  return makeWithState(
    [Chunk.from([duration, ...durations]), true as boolean] as const,
    (now, _, [durations, cont]) =>
      Effect.sync(() => {
        if (cont) {
          const x = durations.unsafeGet(0)!
          const interval = Interval.after(now + x.millis)

          if (durations.length >= 2) {
            return [[durations.drop(1), true] as const, x, Decision.continueWith(interval)] as const
          }

          const y = durations.drop(1)

          return [[y.prepend(x), false] as const, x, Decision.continueWith(interval)] as const
        }

        return [[durations, false] as const, (0).millis, Decision.Done] as const
      })
  )
}
