import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule with its environment provided to it, so the
 * resulting schedule does not require any environment.
 *
 * @tsplus fluent ets/Schedule provideEnvironment
 * @tsplus fluent ets/Schedule/WithState provideEnvironment
 */
export function provideEnvironment_<State, R, In, Out>(
  self: Schedule<State, R, In, Out>,
  environment: LazyArg<Env<R>>
): Schedule<State, unknown, In, Out> {
  return makeWithState(
    self._initial,
    (now, input, state) => self._step(now, input, state).provideEnvironment(environment)
  )
}

/**
 * Returns a new schedule with its environment provided to it, so the
 * resulting schedule does not require any environment.
 *
 * @tsplus static ets/Schedule/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_)
