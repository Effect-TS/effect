import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * Returns a new schedule with the given effectfully computed delay added to
 * every interval defined by this schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects addDelayEffect
 * @tsplus pipeable effect/core/io/Schedule addDelayEffect
 */
export function addDelayEffect<Out, Env1>(
  f: (out: Out) => Effect<Env1, never, Duration>
) {
  return <State, Env, In>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Env1, In, Out> =>
    self.modifyDelayEffect((out, duration) =>
      f(out).map((delay) => new DurationInternal(duration.millis + delay.millis))
    )
}
