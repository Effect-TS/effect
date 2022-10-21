import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * A schedule that occurs everywhere, which returns the total elapsed duration
 * since the first step.
 *
 * @tsplus static effect/core/io/Schedule.Ops elapsed
 */
export const elapsed: Schedule<
  Maybe<number>,
  never,
  unknown,
  Duration
> = makeWithState(Maybe.empty(), (now, _, state) =>
  Effect.succeed(
    state.fold(
      () =>
        [
          Maybe.some(now),
          new DurationInternal(0),
          Decision.continueWith(Interval.after(now))
        ] as const,
      (
        start
      ) =>
        [
          Maybe.some(start),
          new DurationInternal(now - start),
          Decision.continueWith(Interval.after(now))
        ] as const
    )
  ))
