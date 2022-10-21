import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that allows choosing between feeding inputs to this
 * schedule, or feeding inputs to the specified schedule.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule +
 * @tsplus static effect/core/io/Schedule.Aspects choose
 * @tsplus pipeable effect/core/io/Schedule choose
 */
export function choose<State1, Env1, In2, Out2>(
  that: Schedule<State1, Env1, In2, Out2>
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    readonly [State, State1],
    Env | Env1,
    Either<In, In2>,
    Either<Out, Out2>
  > =>
    makeWithState(
      [self.initial, that.initial] as const,
      (
        now,
        either,
        state
      ): Effect<
        Env | Env1,
        never,
        readonly [readonly [State, State1], Either<Out, Out2>, Decision]
      > =>
        either.fold(
          (input) =>
            self
              .step(now, input, state[0])
              .map(([lState, out, decision]) =>
                [[lState, state[1]] as const, Either.left(out), decision] as const
              ),
          (input2) =>
            that
              .step(now, input2, that.initial)
              .map(([rState, out2, decision]) =>
                [[state[0], rState] as const, Either.right(out2), decision] as const
              )
        )
    )
}
