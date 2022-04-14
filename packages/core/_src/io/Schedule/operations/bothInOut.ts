import { Decision } from "@effect/core/io/Schedule/Decision";
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState";

/**
 * Returns a new schedule that has both the inputs and outputs of this and the
 * specified schedule.
 *
 * @tsplus operator ets/Schedule **
 * @tsplus operator ets/Schedule/WithState **
 * @tsplus fluent ets/Schedule bothInOut
 * @tsplus fluent ets/Schedule/WithState bothInOut
 */
export function bothInOut_<State, Env, In, Out, State1, Env1, In2, Out2>(
  self: Schedule<State, Env, In, Out>,
  that: Schedule<State1, Env1, In2, Out2>
): Schedule<
  Tuple<[State, State1]>,
  Env & Env1,
  Tuple<[In, In2]>,
  Tuple<[Out, Out2]>
> {
  return makeWithState(
    Tuple(self._initial, that._initial),
    (now, { tuple: [in1, in2] }, state) =>
      self
        ._step(now, in1, state.get(0))
        .zipWith(
          that._step(now, in2, state.get(1)),
          (
            { tuple: [lState, out, lDecision] },
            { tuple: [rState, out2, rDecision] }
          ) => {
            if (lDecision._tag === "Continue" && rDecision._tag === "Continue") {
              const interval = lDecision.interval
                .union(rDecision.interval)
                .getOrElse(lDecision.interval.min(rDecision.interval));
              return Tuple(
                Tuple(lState, rState),
                Tuple(out, out2),
                Decision.Continue(interval)
              );
            }
            return Tuple(Tuple(lState, rState), Tuple(out, out2), Decision.Done);
          }
        )
  );
}

/**
 * Returns a new schedule that has both the inputs and outputs of this and the
 * specified schedule.
 *
 * @tsplus static ets/Schedule/Aspects bothInOut
 */
export const bothInOut = Pipeable(bothInOut_);
