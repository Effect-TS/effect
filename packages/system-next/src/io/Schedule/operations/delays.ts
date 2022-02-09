import { Tuple } from "../../../collection/immutable/Tuple"
import { Duration } from "../../../data/Duration"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that outputs the delay between each occurence.
 *
 * @tsplus fluent ets/Schedule delays
 * @tsplus fluent ets/ScheduleWithState delays
 */
export function delays<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>
): Schedule.WithState<State, Env, In, Duration> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, _, decision] }) =>
        decision._tag === "Done"
          ? Effect.succeedNow(Tuple(state, Duration.Zero, decision))
          : Effect.succeedNow(
              Tuple(
                state,
                Duration(decision.interval.startMilliseconds - now),
                decision
              )
            )
      )
  )
}
