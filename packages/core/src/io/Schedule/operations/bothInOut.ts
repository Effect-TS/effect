import { Tuple } from "../../../collection/immutable/Tuple"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that has both the inputs and outputs of this and the
 * specified schedule.
 *
 * @tsplus operator ets/Schedule **
 * @tsplus operator ets/ScheduleWithState **
 * @tsplus fluent ets/Schedule bothInOut
 * @tsplus fluent ets/ScheduleWithState bothInOut
 */
export function bothInOut_<State, Env, In, Out, State1, Env1, In2, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In2, Out2>
): Schedule.WithState<
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
                .getOrElse(lDecision.interval.min(rDecision.interval))
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

/**
 * Returns a new schedule that has both the inputs and outputs of this and the
 * specified schedule.
 *
 * @ets_data_first bothInOut_
 */
export function bothInOut<State1, Env1, In2, Out2>(
  that: Schedule.WithState<State1, Env1, In2, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<
    Tuple<[State, State1]>,
    Env & Env1,
    Tuple<[In, In2]>,
    Tuple<[Out, Out2]>
  > => self ** that
}
