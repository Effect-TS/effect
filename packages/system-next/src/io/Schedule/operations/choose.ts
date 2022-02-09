import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either"
import type { Effect } from "../../Effect"
import type { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that allows choosing between feeding inputs to this
 * schedule, or feeding inputs to the specified schedule.
 *
 * @tsplus operator ets/Schedule +
 * @tsplus operator ets/ScheduleWithState +
 * @tsplus fluent ets/Schedule choose
 * @tsplus fluent ets/ScheduleWithState choose
 */
export function choose_<State, Env, In, Out, State1, Env1, In2, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In2, Out2>
): Schedule.WithState<
  Tuple<[State, State1]>,
  Env & Env1,
  Either<In, In2>,
  Either<Out, Out2>
> {
  return makeWithState(
    Tuple(self._initial, that._initial),
    (
      now,
      either,
      state
    ): Effect<
      Env & Env1,
      never,
      Tuple<[Tuple<[State, State1]>, Either<Out, Out2>, Decision]>
    > =>
      either.fold(
        (input) =>
          self
            ._step(now, input, state.get(0))
            .map(({ tuple: [lState, out, decision] }) =>
              Tuple(Tuple(lState, state.get(1)), Either.left(out), decision)
            ),
        (input2) =>
          that
            ._step(now, input2, that._initial)
            .map(({ tuple: [rState, out2, decision] }) =>
              Tuple(Tuple(state.get(0), rState), Either.right(out2), decision)
            )
      )
  )
}

/**
 * Returns a new schedule that allows choosing between feeding inputs to this
 * schedule, or feeding inputs to the specified schedule.
 *
 * @ets_data_first choose_
 */
export function choose<State1, Env1, In2, Out2>(
  that: Schedule.WithState<State1, Env1, In2, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<
    Tuple<[State, State1]>,
    Env & Env1,
    Either<In, In2>,
    Either<Out, Out2>
  > => self + that
}
