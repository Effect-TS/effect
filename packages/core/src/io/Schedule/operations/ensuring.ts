import type { Decision } from "@effect/core/io/Schedule/Decision"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"

/**
 * Returns a new schedule that will run the specified finalizer as soon as the
 * schedule is complete. Note that unlike `Effect.ensuring`, this method does not
 * guarantee the finalizer will be run. The `Schedule` may not initialize or
 * the driver of the schedule may not run to completion. However, if the
 * `Schedule` ever decides not to continue, then the finalizer will be run.
 *
 * @tsplus static effect/core/io/Schedule.Aspects ensuring
 * @tsplus pipeable effect/core/io/Schedule ensuring
 */
export function ensuring<X>(finalizer: Effect<never, never, X>) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env, In, Out> =>
    makeWithState(self.initial, (now, input, state) =>
      self
        .step(now, input, state)
        .flatMap((
          [state, out, decision]
        ): Effect<never, never, readonly [State, Out, Decision]> =>
          decision._tag === "Done"
            ? finalizer.as([state, out, decision] as const)
            : Effect.succeed([state, out, decision] as const)
        ))
}
