import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects resetWhen
 * @tsplus pipeable effect/core/io/Schedule resetWhen
 * @category mutations
 * @since 1.0.0
 */
export function resetWhen<Out>(f: Predicate<Out>) {
  return <State, Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In, Out> =>
    makeWithState(self.initial, (now, input, state) =>
      self
        .step(now, input, state)
        .flatMap(([state, out, decision]) =>
          f(out)
            ? self.step(now, input, self.initial)
            : Effect.succeed([state, out, decision])
        ))
}
