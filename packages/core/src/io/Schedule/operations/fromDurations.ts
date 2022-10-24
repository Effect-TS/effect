import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Duration from "@fp-ts/data/Duration"
import { pipe } from "@fp-ts/data/Function"

/**
 * A schedule that recurs once for each of the specified durations, delaying
 * each time for the length of the specified duration. Returns the length of
 * the current duration between recurrences.
 *
 * @tsplus static effect/core/io/Schedule.Ops fromDurations
 * @category constructors
 * @since 1.0.0
 */
export function fromDurations(
  duration: Duration.Duration,
  ...durations: Array<Duration.Duration>
): Schedule<
  readonly [Chunk.Chunk<Duration.Duration>, boolean],
  never,
  unknown,
  Duration.Duration
> {
  return makeWithState(
    [Chunk.make(duration, ...durations), true as boolean] as const,
    (now, _, [durations, cont]) =>
      Effect.sync(() => {
        if (cont) {
          const x = pipe(durations, Chunk.unsafeGet(0))
          const interval = Interval.after(now + x.millis)
          if (durations.length >= 2) {
            return [
              [pipe(durations, Chunk.drop(1)), true] as const,
              x,
              Decision.continueWith(interval)
            ] as const
          }
          const y = pipe(durations, Chunk.drop(1))
          return [
            [pipe(y, Chunk.prepend(x)), false] as const,
            x,
            Decision.continueWith(interval)
          ] as const
        }
        return [[durations, false] as const, Duration.zero, Decision.Done] as const
      })
  )
}
