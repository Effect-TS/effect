/**
 * Returns a new schedule that randomly modifies the size of the intervals of
 * this schedule.
 *
 * The new interval size is between `min * old interval size` and `max * old
 * interval size`.
 *
 * @tsplus fluent ets/Schedule jittered
 * @tsplus fluent ets/Schedule/WithState jittered
 */
export function jittered_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  min: number,
  max: number
): Schedule<State, Env & Has<Random>, In, Out> {
  return self.delayedEffect((duration) =>
    Random.next.map((random) => {
      const d = duration.millis
      const jittered = d * min * (1 - random) + d * max * random
      return new Duration(jittered)
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
 * @tsplus static ets/Schedule/Aspects jittered
 */
export const jittered = Pipeable(jittered_)

/**
 * Returns a new schedule that randomly modifies the size of the intervals of
 * this schedule.
 *
 * The new interval size is between `min * old interval size` and `max * old
 * interval size`.
 *
 * @tsplus fluent ets/Schedule jitteredDefault
 * @tsplus fluent ets/Schedule/WithState jitteredDefault
 */
export function jitteredDefault<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<State, Env & Has<Random>, In, Out> {
  return self.jittered(0.8, 1.2)
}
