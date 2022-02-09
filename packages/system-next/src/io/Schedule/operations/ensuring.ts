import { Tuple } from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that will run the specified finalizer as soon as the
 * schedule is complete. Note that unlike `Effect.ensuring`, this method does not
 * guarantee the finalizer will be run. The `Schedule` may not initialize or
 * the driver of the schedule may not run to completion. However, if the
 * `Schedule` ever decides not to continue, then the finalizer will be run.
 *
 * @tsplus fluent ets/Schedule ensuring
 * @tsplus fluent ets/ScheduleWithState ensuring
 */
export function ensuring_<State, Env, In, Out, X>(
  self: Schedule.WithState<State, Env, In, Out>,
  finalizer: UIO<X>
): Schedule.WithState<State, Env, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, out, decision] }) =>
        decision._tag === "Done"
          ? finalizer.as(Tuple(state, out, decision))
          : Effect.succeedNow(Tuple(state, out, decision))
      )
  )
}

/**
 * Returns a new schedule that will run the specified finalizer as soon as the
 * schedule is complete. Note that unlike `Effect.ensuring`, this method does not
 * guarantee the finalizer will be run. The `Schedule` may not initialize or
 * the driver of the schedule may not run to completion. However, if the
 * `Schedule` ever decides not to continue, then the finalizer will be run.
 *
 * @ets_data_first ensuring_
 */
export function ensuring<X>(finalizer: UIO<X>) {
  return <State, Env, In, Out, X>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env, In, Out> => self.ensuring(finalizer)
}
