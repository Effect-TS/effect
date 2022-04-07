import { Decision } from "@effect/core/io/Schedule/Decision";
import type { Interval } from "@effect/core/io/Schedule/Interval";
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Returns a new schedule that effectfully reconsiders every decision made by
 * this schedule, possibly modifying the next interval and the output type in
 * the process.
 *
 * @tsplus fluent ets/Schedule reconsiderEffect
 * @tsplus fluent ets/Schedule/WithState reconsiderEffect
 */
export function reconsiderEffect_<State, Env, In, Out, Env1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (
    state: State,
    out: Out,
    decision: Decision
  ) => RIO<Env1, Either<Out2, Tuple<[Out2, Interval]>>>
): Schedule.WithState<State, Env & Env1, In, Out2> {
  return makeWithState(
    self._initial,
    (now, input, state) =>
      self._step(now, input, state).flatMap(({ tuple: [state, out, decision] }) =>
        decision._tag === "Done"
          ? f(state, out, decision).map((either) =>
            either.fold(
              (out2) => Tuple(state, out2, Decision.Done),
              ({ tuple: [out2] }) => Tuple(state, out2, Decision.Done)
            )
          )
          : f(state, out, decision).map((either) =>
            either.fold(
              (out2) => Tuple(state, out2, Decision.Done),
              ({ tuple: [out2, interval] }) => Tuple(state, out2, Decision.Continue(interval))
            )
          )
      )
  );
}

/**
 * Returns a new schedule that effectfully reconsiders every decision made by
 * this schedule, possibly modifying the next interval and the output type in
 * the process.
 *
 * @tsplus static ets/Schedule/Aspects reconsiderEffect
 */
export const reconsiderEffect = Pipeable(reconsiderEffect_);
