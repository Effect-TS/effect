import { Decision } from "@effect/core/io/Schedule/Decision"
import type { Intervals } from "@effect/core/io/Schedule/Intervals"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as either schedule wants to continue and
 * merging the next intervals according to the specified merge function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects unionWith
 * @tsplus pipeable effect/core/io/Schedule unionWith
 */
export function unionWith<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>,
  f: (x: Intervals, y: Intervals) => Intervals
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    Tuple<[State, State1]>,
    Env | Env1,
    In & In1,
    MergeTuple<Out, Out2>
  > =>
    makeWithState(Tuple(self.initial, that.initial), (now, input, state) => {
      const left = self.step(now, input, state.get(0))
      const right = that.step(now, input, state.get(1))
      return left.zipWith(
        right,
        ({ tuple: [lState, l, lDecision] }, { tuple: [rState, r, rDecision] }) => {
          if (lDecision._tag === "Done" && rDecision._tag === "Done") {
            return Tuple(Tuple(lState, rState), Tuple.mergeTuple(l, r), Decision.Done)
          }
          if (lDecision._tag === "Done" && rDecision._tag === "Continue") {
            return Tuple(
              Tuple(lState, rState),
              Tuple.mergeTuple(l, r),
              Decision.Continue(rDecision.intervals)
            )
          }
          if (lDecision._tag === "Continue" && rDecision._tag === "Done") {
            return Tuple(
              Tuple(lState, rState),
              Tuple.mergeTuple(l, r),
              Decision.Continue(lDecision.intervals)
            )
          }
          if (lDecision._tag === "Continue" && rDecision._tag === "Continue") {
            const combined = f(lDecision.intervals, rDecision.intervals)
            return Tuple(
              Tuple(lState, rState),
              Tuple.mergeTuple(l, r),
              Decision.Continue(combined)
            )
          }
          throw new Error("bug")
        }
      )
    })
}
