import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that will run the specified finalizer as soon as the
 * schedule is complete. Note that unlike `Effect.ensuring`, this method does not
 * guarantee the finalizer will be run. The `Schedule` may not initialize or
 * the driver of the schedule may not run to completion. However, if the
 * `Schedule` ever decides not to continue, then the finalizer will be run.
 *
 * @tsplus fluent ets/Schedule ensuring
 * @tsplus fluent ets/Schedule/WithState ensuring
 */
export function ensuring_<State, Env, In, Out, X>(
  self: Schedule<State, Env, In, Out>,
  finalizer: Effect.UIO<X>
): Schedule<State, Env, In, Out> {
  return makeWithState(self._initial, (now, input, state) =>
    self
      ._step(now, input, state)
      .flatMap(({ tuple: [state, out, decision] }): Effect.UIO<Tuple<[State, Out, Decision]>> =>
        decision._tag === "Done"
          ? finalizer.as(Tuple(state, out, decision))
          : Effect.succeedNow(Tuple(state, out, decision))
      ))
}

/**
 * Returns a new schedule that will run the specified finalizer as soon as the
 * schedule is complete. Note that unlike `Effect.ensuring`, this method does not
 * guarantee the finalizer will be run. The `Schedule` may not initialize or
 * the driver of the schedule may not run to completion. However, if the
 * `Schedule` ever decides not to continue, then the finalizer will be run.
 *
 * @tsplus static ets/Schedule/Aspects ensuring
 */
export const ensuring = Pipeable(ensuring_)
