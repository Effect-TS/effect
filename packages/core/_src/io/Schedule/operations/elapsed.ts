import { Decision } from "@effect/core/io/Schedule/Decision";
import { Interval } from "@effect/core/io/Schedule/Interval";
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState";

/**
 * A schedule that occurs everywhere, which returns the total elapsed duration
 * since the first step.
 *
 * @tsplus static ets/Schedule/Ops elapsed
 */
export const elapsed: Schedule<
  Option<number>,
  unknown,
  unknown,
  Duration
> = makeWithState(Option.emptyOf(), (now, _, state) =>
  Effect.succeed(
    state.fold(
      () => Tuple(Option.some(now), (0).millis, Decision.Continue(Interval.after(now))),
      (start) =>
        Tuple(
          Option.some(start),
          new Duration(now - start),
          Decision.Continue(Interval.after(now))
        )
    )
  ));
