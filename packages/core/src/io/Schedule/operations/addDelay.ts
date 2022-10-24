import type { Duration } from "@fp-ts/data/Duration"

/**
 * Returns a new schedule with the given delay added to every interval defined
 * by this schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects addDelay
 * @tsplus pipeable effect/core/io/Schedule addDelay
 * @category mutations
 * @since 1.0.0
 */
export function addDelay<Out>(f: (out: Out) => Duration) {
  return <State, Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In, Out> =>
    self.addDelayEffect((out) => Effect.sync(f(out)))
}
