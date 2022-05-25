import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that outputs the delay between each occurence.
 *
 * @tsplus fluent ets/Schedule delays
 * @tsplus fluent ets/Schedule/WithState delays
 */
export function delays<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<State, Env, In, Duration> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, _, decision] }): Effect.UIO<Tuple<[State, Duration, Decision]>> =>
        decision._tag === "Done"
          ? Effect.succeedNow(Tuple(state, (0).millis, decision))
          : Effect.succeedNow(
            Tuple(
              state,
              new Duration(decision.interval.startMillis - now),
              decision
            )
          )
      ))
}
