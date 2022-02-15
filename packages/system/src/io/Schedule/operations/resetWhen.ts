import { Tuple } from "../../../collection/immutable/Tuple"
import type { Predicate } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to true.
 *
 * @tsplus fluent ets/Schedule resetWhen
 * @tsplus fluent ets/ScheduleWithState resetWhen
 */
export function resetWhen_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: Predicate<Out>
): Schedule.WithState<State, Env, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, out, decision] }) =>
        f(out)
          ? self._step(now, input, self._initial)
          : Effect.succeedNow(Tuple(state, out, decision))
      )
  )
}

/**
 * Resets the schedule when the specified predicate on the schedule output
 * evaluates to true.
 *
 * @ets_data_first resetWhen_
 */
export function resetWhen<Out>(f: Predicate<Out>) {
  return <State, Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.resetWhen(f)
}
