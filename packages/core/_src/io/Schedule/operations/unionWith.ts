import { Decision } from "@effect/core/io/Schedule/Decision"
import type { Interval } from "@effect/core/io/Schedule/Interval"
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
  f: (x: Interval, y: Interval) => Interval
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    Tuple<[State, State1]>,
    Env | Env1,
    In & In1,
    MergeTuple<Out, Out2>
  > =>
    makeWithState(Tuple(self._initial, that._initial), (now, input, state) => {
      const left = self._step(now, input, state.get(0))
      const right = that._step(now, input, state.get(1))
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
              Decision.Continue(rDecision.interval)
            )
          }
          if (lDecision._tag === "Continue" && rDecision._tag === "Done") {
            return Tuple(
              Tuple(lState, rState),
              Tuple.mergeTuple(l, r),
              Decision.Continue(lDecision.interval)
            )
          }
          if (lDecision._tag === "Continue" && rDecision._tag === "Continue") {
            const combined = f(lDecision.interval, rDecision.interval)
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
