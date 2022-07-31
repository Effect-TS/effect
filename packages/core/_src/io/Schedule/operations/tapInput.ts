import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that effectfully processes every input to this
 * schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects tapInput
 * @tsplus pipeable effect/core/io/Schedule tapInput
 */
export function tapInput<Env1, In1, X>(
  f: (in1: In1) => Effect<Env1, never, X>
) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In & In1, Out> =>
    makeWithState(
      self._initial,
      (now, input, state) => f(input) > self._step(now, input, state)
    )
}
