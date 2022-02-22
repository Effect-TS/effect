import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import type { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that combines this schedule with the specified
 * schedule, continuing as long as either schedule wants to continue and
 * merging the next intervals according to the specified merge function.
 *
 * @tsplus fluent ets/Schedule unionWith
 * @tsplus fluent ets/ScheduleWithState unionWith
 */
export function unionWith_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>,
  f: (x: Interval, y: Interval) => Interval
): Schedule.WithState<
  Tuple<[State, State1]>,
  Env & Env1,
  In & In1,
  MergeTuple<Out, Out2>
> {
  return makeWithState(Tuple(self._initial, that._initial), (now, input, state) => {
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

/**
 * @ets_data_first unionWith_
 */
export function unionWith<State1, Env1, In1, Out2>(
  that: Schedule.WithState<State1, Env1, In1, Out2>,
  f: (x: Interval, y: Interval) => Interval
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<
    Tuple<[State, State1]>,
    Env & Env1,
    In & In1,
    MergeTuple<Out, Out2>
  > => self.unionWith(that, f)
}
