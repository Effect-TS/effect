import type { Duration } from "@fp-ts/data/Duration"

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects delayedEffect
 * @tsplus pipeable effect/core/io/Schedule delayedEffect
 * @category constructors
 * @since 1.0.0
 */
export function delayedEffect<Env1>(
  f: (duration: Duration) => Effect<Env1, never, Duration>
) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> => self.modifyDelayEffect((_, delay) => f(delay))
}
