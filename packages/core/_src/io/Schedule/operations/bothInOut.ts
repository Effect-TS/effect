import { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that has both the inputs and outputs of this and the
 * specified schedule.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule **
 * @tsplus static effect/core/io/Schedule.Aspects bothInOut
 * @tsplus pipeable effect/core/io/Schedule bothInOut
 */
export function bothInOut<State1, Env1, In2, Out2>(
  that: Schedule<State1, Env1, In2, Out2>
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    Tuple<[State, State1]>,
    Env | Env1,
    Tuple<[In, In2]>,
    Tuple<[Out, Out2]>
  > =>
    makeWithState(
      Tuple(self.initial, that.initial),
      (now, { tuple: [in1, in2] }, state) =>
        self
          .step(now, in1, state.get(0))
          .zipWith(
            that.step(now, in2, state.get(1)),
            (
              { tuple: [lState, out, lDecision] },
              { tuple: [rState, out2, rDecision] }
            ) => {
              if (lDecision._tag === "Continue" && rDecision._tag === "Continue") {
                const interval = lDecision.intervals.union(rDecision.intervals)
                return Tuple(
                  Tuple(lState, rState),
                  Tuple(out, out2),
                  Decision.Continue(interval)
                )
              }
              return Tuple(Tuple(lState, rState), Tuple(out, out2), Decision.Done)
            }
          )
    )
}
