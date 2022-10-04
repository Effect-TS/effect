import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that passes through the inputs of this schedule.
 *
 * @tsplus static effect/core/io/Schedule.Ops passthrough
 * @tsplus getter effect/core/io/Schedule passthrough
 */
export function passthrough<State, Env, Input, Output>(
  self: Schedule<State, Env, Input, Output>
): Schedule<State, Env, Input, Input> {
  return makeWithState(
    self.initial,
    (now, input, state) =>
      self.step(now, input, state).map(([state, _, decision]) => [state, input, decision])
  )
}
