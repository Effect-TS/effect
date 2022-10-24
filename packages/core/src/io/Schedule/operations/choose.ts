import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import * as Either from "@fp-ts/data/Either"

/**
 * Returns a new schedule that allows choosing between feeding inputs to this
 * schedule, or feeding inputs to the specified schedule.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule +
 * @tsplus static effect/core/io/Schedule.Aspects choose
 * @tsplus pipeable effect/core/io/Schedule choose
 * @category alternatives
 * @since 1.0.0
 */
export function choose<State1, Env1, In2, Out2>(
  that: Schedule<State1, Env1, In2, Out2>
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    readonly [State, State1],
    Env | Env1,
    Either.Either<In, In2>,
    Either.Either<Out, Out2>
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
        readonly [readonly [State, State1], Either.Either<Out, Out2>, Decision]
      > => {
        switch (either._tag) {
          case "Left": {
            return self.step(now, either.left, state[0]).map(([lState, out, decision]) =>
              [[lState, state[1]] as const, Either.left(out), decision] as const
            )
          }
          case "Right": {
            return that.step(now, either.right, that.initial).map(([rState, out2, decision]) =>
              [[state[0], rState] as const, Either.right(out2), decision] as const
            )
          }
        }
      }
    )
}
