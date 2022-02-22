import { Tuple } from "../../../collection/immutable/Tuple"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns the composition of this schedule and the specified schedule, by
 * piping the output of this one into the input of the other. Effects
 * described by this schedule will always be executed before the effects
 * described by the second schedule.
 *
 * @tsplus operator ets/Schedule >>
 * @tsplus operator ets/ScheduleWithState >>
 * @tsplus fluent ets/Schedule compose
 * @tsplus fluent ets/ScheduleWithState compose
 */
export function compose_<State, Env, In, Out, State1, Env1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, Out, Out2>
): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In, Out2> {
  return makeWithState(Tuple(self._initial, that._initial), (now, input, state) =>
    self
      ._step(now, input, state.get(0))
      .flatMap(({ tuple: [lState, out, lDecision] }) =>
        that
          ._step(now, out, state.get(1))
          .map(({ tuple: [rState, out2, rDecision] }) =>
            lDecision._tag === "Done"
              ? Tuple(Tuple(lState, rState), out2, Decision.Done)
              : rDecision._tag === "Done"
              ? Tuple(Tuple(lState, rState), out2, Decision.Done)
              : Tuple(
                  Tuple(lState, rState),
                  out2,
                  Decision.Continue(lDecision.interval.max(rDecision.interval))
                )
          )
      )
  )
}

/**
 * Returns the composition of this schedule and the specified schedule, by
 * piping the output of this one into the input of the other. Effects
 * described by this schedule will always be executed before the effects
 * described by the second schedule.
 *
 * @ets_data_first compose_
 */
export function compose<State1, Env1, Out, Out2>(
  that: Schedule.WithState<State1, Env1, Out, Out2>
) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<Tuple<[State, State1]>, Env & Env1, In, Out2> => self >> that
}
