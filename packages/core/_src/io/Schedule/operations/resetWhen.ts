import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to true.
 *
 * @tsplus static effect/core/io/Schedule.Aspects resetWhen
 * @tsplus pipeable effect/core/io/Schedule resetWhen
 */
export function resetWhen<Out>(f: Predicate<Out>) {
  return <State, Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In, Out> =>
    makeWithState(self._initial, (now, input, state) =>
      self
        ._step(now, input, state)
        .flatMap(({ tuple: [state, out, decision] }) =>
          f(out)
            ? self._step(now, input, self._initial)
            : Effect.succeed(Tuple(state, out, decision))
        ))
}
