import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that first executes this schedule to completion, and
 * then executes the specified schedule to completion.
 *
 * @tsplus operator ets/Schedule %
 * @tsplus operator ets/ScheduleWithState %
 * @tsplus fluent ets/Schedule andThenEither
 * @tsplus fluent ets/ScheduleWithState andThenEither
 */
export function andThenEither_<State, Env, In, Out, State1, Env1, In1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  that: Schedule.WithState<State1, Env1, In1, Out2>
): Schedule.WithState<
  Tuple<[State, State1, boolean]>,
  Env & Env1,
  In & In1,
  Either<Out, Out2>
> {
  return makeWithState(
    Tuple<[State, State1, boolean]>(self._initial, that._initial, true),
    (now, input, state) =>
      state.get(2)
        ? self
            ._step(now, input, state.get(0))
            .flatMap(({ tuple: [lState, out, decision] }) =>
              decision._tag === "Done"
                ? that
                    ._step(now, input, state.get(1))
                    .map(({ tuple: [rState, out, decision] }) =>
                      Tuple(Tuple(lState, rState, false), Either.rightW(out), decision)
                    )
                : Effect.succeedNow(
                    Tuple(
                      Tuple(lState, state.get(1), true),
                      Either.leftW(out),
                      Decision.Continue(decision.interval)
                    )
                  )
            )
        : that
            ._step(now, input, state.get(1))
            .map(({ tuple: [rState, out, decision] }) =>
              Tuple(Tuple(state.get(0), rState, false), Either.rightW(out), decision)
            )
  )
}

/**
 * Returns a new schedule that first executes this schedule to completion, and
 * then executes the specified schedule to completion.
 *
 * @ets_data_first andThenEither_
 */
export function andThenEither<State1, Env1, In1, Out2>(
  that: Schedule.WithState<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<
    Tuple<[State, State1, boolean]>,
    Env & Env1,
    In & In1,
    Either<Out, Out2>
  > => self.andThenEither(that)
}
