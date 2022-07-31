import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Transforms the environment being provided to this schedule with the
 * specified function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects provideSomeEnvironment
 * @tsplus pipeable effect/core/io/Schedule provideSomeEnvironment
 */
export function provideSomeEnvironment<R0, R>(f: (env0: Env<R0>) => Env<R>) {
  return <State, In, Out>(self: Schedule<State, R, In, Out>): Schedule<State, R0, In, Out> =>
    makeWithState(
      self.initial,
      (now, input, state) => self.step(now, input, state).provideSomeEnvironment(f)
    )
}
