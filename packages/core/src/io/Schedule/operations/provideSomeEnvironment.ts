import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import type { Context } from "@fp-ts/data/Context"

/**
 * Transforms the environment being provided to this schedule with the
 * specified function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/io/Schedule provideSomeEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideSomeEnvironment<R0, R>(f: (env0: Context<R0>) => Context<R>) {
  return <State, In, Out>(self: Schedule<State, R, In, Out>): Schedule<State, R0, In, Out> =>
    makeWithState(
      self.initial,
      (now, input, state) => self.step(now, input, state).provideSomeEnvironment(f)
    )
}
