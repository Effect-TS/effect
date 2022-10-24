import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects contramapEffect
 * @tsplus pipeable effect/core/io/Schedule contramapEffect
 * @category mapping
 * @since 1.0.0
 */
export function contramapEffect<In, Env1, In2>(
  f: (in2: In2) => Effect<Env1, never, In>
) {
  return <State, Env, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In2, Out> =>
    makeWithState(
      self.initial,
      (now, input2, state) => f(input2).flatMap((input) => self.step(now, input, state))
    )
}
