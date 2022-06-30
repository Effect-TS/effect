import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule with the single service it requires provided to it.
 * If the schedule requires multiple services use `provideEnvironment`
 * instead.
 *
 * @tsplus static effect/core/io/Schedule.Aspects provideService
 * @tsplus pipeable effect/core/io/Schedule provideService
 */
export function provideService<T, T1 extends T>(tag: Tag<T>, service: LazyArg<T1>) {
  return <State, R, In, Out>(
    self: Schedule<State, R | T, In, Out>
  ): Schedule<State, Exclude<R, T>, In, Out> =>
    makeWithState(
      self._initial,
      (now, input, state) =>
        Effect.environmentWithEffect((env: Env<Exclude<R, T>>) =>
          self
            ._step(now, input, state)
            .provideEnvironment(env.add(tag, service()))
        )
    )
}
