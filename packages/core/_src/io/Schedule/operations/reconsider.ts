import type { Decision } from "@effect/core/io/Schedule/Decision";
import type { Interval } from "@effect/core/io/Schedule/Interval";

/**
 * Returns a new schedule that reconsiders every decision made by this
 * schedule, possibly modifying the next interval and the output type in the
 * process.
 *
 * @tsplus fluent ets/Schedule reconsider
 * @tsplus fluent ets/Schedule/WithState reconsider
 */
export function reconsider_<State, Env, In, Out, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (
    state: State,
    out: Out,
    decision: Decision
  ) => Either<Out2, Tuple<[Out2, Interval]>>
): Schedule.WithState<State, Env, In, Out2> {
  return self.reconsiderEffect((state, out, decision) => Effect.succeed(f(state, out, decision)));
}

/**
 * Returns a new schedule that reconsiders every decision made by this
 * schedule, possibly modifying the next interval and the output type in the
 * process.
 *
 * @tsplus static ets/Schedule/Aspects reconsider
 */
export const reconsider = Pipeable(reconsider_);
