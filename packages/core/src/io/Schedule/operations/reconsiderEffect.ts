import { Decision } from "@effect/core/io/Schedule/Decision"
import type { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import type { Either } from "@fp-ts/data/Either"

/**
 * Returns a new schedule that effectfully reconsiders every decision made by
 * this schedule, possibly modifying the next interval and the output type in
 * the process.
 *
 * @tsplus static effect/core/io/Schedule.Aspects reconsiderEffect
 * @tsplus pipeable effect/core/io/Schedule reconsiderEffect
 * @category mutations
 * @since 1.0.0
 */
export function reconsiderEffect<State, Out, Env1, Out2>(
  f: (
    state: State,
    out: Out,
    decision: Decision
  ) => Effect<Env1, never, Either<Out2, readonly [Out2, Interval]>>
) {
  return <Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env | Env1, In, Out2> =>
    makeWithState(
      self.initial,
      (now, input, state) =>
        self.step(now, input, state).flatMap(([state, out, decision]) =>
          decision._tag === "Done"
            ? f(state, out, decision).map((either) => {
              switch (either._tag) {
                case "Left": {
                  return [state, either.left, Decision.Done] as const
                }
                case "Right": {
                  const [out2] = either.right
                  return [state, out2, Decision.Done] as const
                }
              }
            })
            : f(state, out, decision).map((either) => {
              switch (either._tag) {
                case "Left": {
                  return [state, either.left, Decision.Done] as const
                }
                case "Right": {
                  const [out2, interval] = either.right
                  return [state, out2, Decision.continueWith(interval)] as const
                }
              }
            })
        )
    )
}
