import { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that has both the inputs and outputs of this and the
 * specified schedule.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule **
 * @tsplus static effect/core/io/Schedule.Aspects bothInOut
 * @tsplus pipeable effect/core/io/Schedule bothInOut
 * @category mutations
 * @since 1.0.0
 */
export function bothInOut<State1, Env1, In2, Out2>(
  that: Schedule<State1, Env1, In2, Out2>
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    readonly [State, State1],
    Env | Env1,
    readonly [In, In2],
    readonly [Out, Out2]
  > =>
    makeWithState(
      [self.initial, that.initial] as const,
      (now, [in1, in2], state) =>
        self
          .step(now, in1, state[0])
          .zipWith(
            that.step(now, in2, state[1]),
            (
              [lState, out, lDecision],
              [rState, out2, rDecision]
            ) => {
              if (lDecision._tag === "Continue" && rDecision._tag === "Continue") {
                const interval = lDecision.intervals.union(rDecision.intervals)
                return [
                  [lState, rState] as const,
                  [out, out2] as const,
                  Decision.Continue(interval)
                ] as const
              }
              return [[lState, rState] as const, [out, out2] as const, Decision.Done] as const
            }
          )
    )
}
