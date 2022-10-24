import * as Duration from "@fp-ts/data/Duration"

/**
 * Returns a new schedule with the given effectfully computed delay added to
 * every interval defined by this schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects addDelayEffect
 * @tsplus pipeable effect/core/io/Schedule addDelayEffect
 * @category mutations
 * @since 1.0.0
 */
export function addDelayEffect<Out, Env1>(
  f: (out: Out) => Effect<Env1, never, Duration.Duration>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> =>
    self.modifyDelayEffect((out, duration) =>
      f(out).map((delay) => Duration.millis(duration.millis + delay.millis))
    )
}
