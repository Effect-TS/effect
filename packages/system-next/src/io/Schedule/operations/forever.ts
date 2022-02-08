import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that loops this one continuously, resetting the
 * state when this schedule is done.
 *
 * @tsplus fluent ets/Schedule forever
 * @tsplus fluent ets/ScheduleWithState forever
 */
export function forever<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>
): Schedule.WithState<State, Env, In, Out> {
  return makeWithState(self._initial, (now, input, state) => {
    function step(
      now: number,
      input: In,
      state: State
    ): Effect<Env, never, Tuple<[State, Out, Decision]>> {
      return self
        ._step(now, input, state)
        .flatMap(({ tuple: [state, out, decision] }) =>
          decision._tag === "Done"
            ? step(now, input, self._initial)
            : Effect.succeedNow(Tuple(state, out, Decision.Continue(decision.interval)))
        )
    }
    return step(now, input, state)
  })
}
