/**
 * Returns a new schedule with the given delay added to every interval defined
 * by this schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects addDelay
 * @tsplus pipeable effect/core/io/Schedule addDelay
 */
export function addDelay<Out>(f: (out: Out) => Duration) {
  return <State, Env, In>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In, Out> =>
    self.addDelayEffect((out) => Effect.succeed(f(out)))
}
