import { Decision } from "@effect-ts/core/io/Schedule/Decision";
import { Interval } from "@effect-ts/core/io/Schedule/Interval";
import { makeWithState } from "@effect-ts/core/io/Schedule/operations/_internal/makeWithState";

/**
 * A schedule that always recurs, which returns inputs as outputs.
 *
 * @tsplus static ets/Schedule/Ops identity
 */
export function identity<A>(): Schedule.WithState<void, unknown, A, A> {
  return makeWithState(
    undefined as void,
    (now, input, state) => Effect.succeed(Tuple(state, input, Decision.Continue(Interval.after(now))))
  );
}
