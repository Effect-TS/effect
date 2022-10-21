import { Decision } from "@effect/core/io/Schedule/Decision"
import type { Intervals } from "@effect/core/io/Schedule/Intervals"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

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
    readonly [State, State1],
    Env | Env1,
    In & In1,
    readonly [Out, Out2]
  > =>
    makeWithState([self.initial, that.initial] as const, (now, input, state) => {
      const left = self.step(now, input, state[0])
      const right = that.step(now, input, state[1])
      return left.zipWith(
        right,
        ([lState, l, lDecision], [rState, r, rDecision]) => {
          if (lDecision._tag === "Done" && rDecision._tag === "Done") {
            return [[lState, rState] as const, [l, r] as const, Decision.Done] as const
          }
          if (lDecision._tag === "Done" && rDecision._tag === "Continue") {
            return [
              [lState, rState] as const,
              [l, r] as const,
              Decision.Continue(rDecision.intervals)
            ] as const
          }
          if (lDecision._tag === "Continue" && rDecision._tag === "Done") {
            return [
              [lState, rState] as const,
              [l, r],
              Decision.Continue(lDecision.intervals)
            ] as const
          }
          if (lDecision._tag === "Continue" && rDecision._tag === "Continue") {
            const combined = f(lDecision.intervals, rDecision.intervals)
            return [
              [lState, rState] as const,
              [l, r],
              Decision.Continue(combined)
            ] as const
          }
          throw new Error("bug")
        }
      )
    })
}
