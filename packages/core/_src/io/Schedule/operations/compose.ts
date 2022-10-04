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
  ): Schedule<readonly [State, State1], Env | Env1, In, Out2> =>
    makeWithState([self.initial, that.initial] as const, (now, input, state) =>
      self
        .step(now, input, state[0])
        .flatMap(([lState, out, lDecision]) =>
          that
            .step(now, out, state[1])
            .map(([rState, out2, rDecision]) =>
              lDecision._tag === "Done"
                ? [[lState, rState] as const, out2, Decision.Done] as const
                : rDecision._tag === "Done"
                ? [[lState, rState] as const, out2, Decision.Done] as const
                : [
                  [lState, rState] as const,
                  out2,
                  Decision.Continue(lDecision.intervals.max(rDecision.intervals))
                ] as const
            )
        ))
}
