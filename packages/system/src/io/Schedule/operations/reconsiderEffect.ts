import { Tuple } from "../../../collection/immutable/Tuple"
import type { Either } from "../../../data/Either"
import type { RIO } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import type { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * Returns a new schedule that effectfully reconsiders every decision made by
 * this schedule, possibly modifying the next interval and the output type in
 * the process.
 *
 * @tsplus fluent ets/Schedule reconsiderEffect
 * @tsplus fluent ets/ScheduleWithState reconsiderEffect
 */
export function reconsiderEffect_<State, Env, In, Out, Env1, Out2>(
  self: Schedule.WithState<State, Env, In, Out>,
  f: (
    state: State,
    out: Out,
    decision: Decision
  ) => RIO<Env1, Either<Out2, Tuple<[Out2, Interval]>>>
): Schedule.WithState<State, Env & Env1, In, Out2> {
  return makeWithState(self._initial, (now, input, state) =>
    self._step(now, input, state).flatMap(({ tuple: [state, out, decision] }) =>
      decision._tag === "Done"
        ? f(state, out, decision).map((either) =>
            either.fold(
              (out2) => Tuple(state, out2, Decision.Done),
              ({ tuple: [out2] }) => Tuple(state, out2, Decision.Done)
            )
          )
        : f(state, out, decision).map((either) =>
            either.fold(
              (out2) => Tuple(state, out2, Decision.Done),
              ({ tuple: [out2, interval] }) =>
                Tuple(state, out2, Decision.Continue(interval))
            )
          )
    )
  )
}

/**
 * Returns a new schedule that effectfully reconsiders every decision made by
 * this schedule, possibly modifying the next interval and the output type in
 * the process.
 *
 * @ets_data_first reconsiderEffect_
 */
export function reconsiderEffect<State, Env1, Out, Out2>(
  f: (
    state: State,
    out: Out,
    decision: Decision
  ) => RIO<Env1, Either<Out2, Tuple<[Out2, Interval]>>>
) {
  return <Env, In>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & Env1, In, Out2> => self.reconsiderEffect(f)
}
