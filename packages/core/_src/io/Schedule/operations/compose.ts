import { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns the composition of this schedule and the specified schedule, by
 * piping the output of this one into the input of the other. Effects
 * described by this schedule will always be executed before the effects
 * described by the second schedule.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule >>
 * @tsplus static effect/core/io/Schedule.Aspects compose
 * @tsplus pipeable effect/core/io/Schedule compose
 */
export function compose<Out, State1, Env1, Out2>(
  that: Schedule<State1, Env1, Out, Out2>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<Tuple<[State, State1]>, Env | Env1, In, Out2> =>
    makeWithState(Tuple(self._initial, that._initial), (now, input, state) =>
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
        ))
}
