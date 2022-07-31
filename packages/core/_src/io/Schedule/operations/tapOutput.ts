import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that effectfully processes every output from this
 * schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects tapOutput
 * @tsplus pipeable effect/core/io/Schedule tapOutput
 */
export function tapOutput<Out, Env1, X>(f: (out: Out) => Effect<Env1, never, X>) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> =>
    makeWithState(
      self._initial,
      (now, input, state) => self._step(now, input, state).tap(({ tuple: [, out] }) => f(out))
    )
}
