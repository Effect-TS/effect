import type { Decision } from "@effect/core/io/Schedule/Decision"
import type { Interval } from "@effect/core/io/Schedule/Interval"

/**
 * Returns a new schedule that reconsiders every decision made by this
 * schedule, possibly modifying the next interval and the output type in the
 * process.
 *
 * @tsplus static effect/core/io/Schedule.Aspects reconsider
 * @tsplus pipeable effect/core/io/Schedule reconsider
 */
export function reconsider<State, Out, Out2>(
  f: (
    state: State,
    out: Out,
    decision: Decision
  ) => Either<Out2, Tuple<[Out2, Interval]>>
) {
  return <Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In, Out2> =>
    self.reconsiderEffect((state, out, decision) => Effect.sync(f(state, out, decision)))
}
