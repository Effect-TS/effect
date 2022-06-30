import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule with its environment provided to it, so the
 * resulting schedule does not require any environment.
 *
 * @tsplus static effect/core/io/Schedule.Aspects provideEnvironment
 * @tsplus pipeable effect/core/io/Schedule provideEnvironment
 */
export function provideEnvironment<R>(environment: LazyArg<Env<R>>) {
  return <State, In, Out>(self: Schedule<State, R, In, Out>): Schedule<State, never, In, Out> =>
    makeWithState(
      self._initial,
      (now, input, state) => self._step(now, input, state).provideEnvironment(environment)
    )
}
