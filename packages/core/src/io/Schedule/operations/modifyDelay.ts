import type { Duration } from "@fp-ts/data/Duration"

/**
 * Returns a new schedule that modifies the delay using the specified
 * function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects modifyDelay
 * @tsplus pipeable effect/core/io/Schedule modifyDelay
 * @category mutations
 * @since 1.0.0
 */
export function modifyDelay<Out>(f: (out: Out, duration: Duration) => Duration) {
  return <State, Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In, Out> =>
    self.modifyDelayEffect((out, duration) => Effect.sync(f(out, duration)))
}
