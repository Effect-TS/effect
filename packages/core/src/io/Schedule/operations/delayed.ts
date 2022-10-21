/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects delayed
 * @tsplus pipeable effect/core/io/Schedule delayed
 */
export function delayed(f: (duration: Duration) => Duration) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env, In, Out> => self.delayedEffect((duration) => Effect.sync(f(duration)))
}
