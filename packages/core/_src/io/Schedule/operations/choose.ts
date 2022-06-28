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
    Tuple<[State, State1]>,
    Env | Env1,
    Either<In, In2>,
    Either<Out, Out2>
  > =>
    makeWithState(
      Tuple(self._initial, that._initial),
      (
        now,
        either,
        state
      ): Effect<
        Env | Env1,
        never,
        Tuple<[Tuple<[State, State1]>, Either<Out, Out2>, Decision]>
      > =>
        either.fold(
          (input) =>
            self
              ._step(now, input, state.get(0))
              .map(({ tuple: [lState, out, decision] }) =>
                Tuple(Tuple(lState, state.get(1)), Either.left(out), decision)
              ),
          (input2) =>
            that
              ._step(now, input2, that._initial)
              .map(({ tuple: [rState, out2, decision] }) =>
                Tuple(Tuple(state.get(0), rState), Either.right(out2), decision)
              )
        )
    )
}
