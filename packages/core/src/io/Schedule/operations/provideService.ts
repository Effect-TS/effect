import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import * as Context from "@fp-ts/data/Context"
import { pipe } from "@fp-ts/data/Function"

/**
 * Returns a new schedule with the single service it requires provided to it.
 * If the schedule requires multiple services use `provideEnvironment`
 * instead.
 *
 * @tsplus static effect/core/io/Schedule.Aspects provideService
 * @tsplus pipeable effect/core/io/Schedule provideService
 * @category environment
 * @since 1.0.0
 */
export function provideService<T, T1 extends T>(tag: Context.Tag<T>, service: T1) {
  return <State, R, In, Out>(
    self: Schedule<State, R | T, In, Out>
  ): Schedule<State, Exclude<R, T>, In, Out> =>
    makeWithState(
      self.initial,
      (now, input, state) =>
        Effect.environmentWithEffect((env: Context.Context<Exclude<R, T>>) =>
          // @ts-expect-error
          self.step(now, input, state).provideEnvironment(pipe(env, Context.add(tag)(service)))
        )
    )
}
