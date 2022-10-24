import * as Duration from "@fp-ts/data/Duration"

/**
 * Returns a new schedule that randomly modifies the size of the intervals of
 * this schedule.
 *
 * The new interval size is between `min * old interval size` and `max * old
 * interval size`.
 *
 * @tsplus static effect/core/io/Schedule.Aspects jittered
 * @tsplus pipeable effect/core/io/Schedule jittered
 * @category constructors
 * @since 1.0.0
 */
export function jittered(min: number, max: number) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<State, Env | Random, In, Out> =>
    self.delayedEffect((duration) =>
      Random.next.map((random) => {
        const d = duration.millis
        const jittered = d * min * (1 - random) + d * max * random
        return Duration.millis(jittered)
      })
    )
}

/**
 * Returns a new schedule that randomly modifies the size of the intervals of
 * this schedule.
 *
 * The new interval size is between `min * old interval size` and `max * old
 * interval size`.
 *
 * @tsplus getter effect/core/io/Schedule jitteredDefault
 * @category constructors
 * @since 1.0.0
 */
export function jitteredDefault<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<State, Env | Random, In, Out> {
  return self.jittered(0.8, 1.2)
}
