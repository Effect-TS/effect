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
  Effect.sync(
    state.fold(
      () =>
        Tuple(Maybe.some(now), new DurationInternal(0), Decision.continueWith(Interval.after(now))),
      (start) =>
        Tuple(
          Maybe.some(start),
          new DurationInternal(now - start),
          Decision.continueWith(Interval.after(now))
        )
    )
  ))
