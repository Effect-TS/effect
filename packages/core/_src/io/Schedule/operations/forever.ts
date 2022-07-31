import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that loops this one continuously, resetting the
 * state when this schedule is done.
 *
 * @tsplus getter effect/core/io/Schedule forever
 */
export function forever<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<State, Env, In, Out> {
  return makeWithState(self.initial, (now, input, state) => {
    function step(
      now: number,
      input: In,
      state: State
    ): Effect<Env, never, Tuple<[State, Out, Decision]>> {
      return self
        .step(now, input, state)
        .flatMap(({ tuple: [state, out, decision] }) =>
          decision._tag === "Done"
            ? step(now, input, self.initial)
            : Effect.succeed(Tuple(state, out, decision))
        )
    }
    return step(now, input, state)
  })
}
