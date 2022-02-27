import { Duration } from "../../../data/Duration"
import type { HasRandom } from "../../Random"
import { Random } from "../../Random"
import type { Schedule } from "../definition"

/**
 * Returns a new schedule that randomly modifies the size of the intervals of
 * this schedule.
 *
 * The new interval size is between `min * old interval size` and `max * old
 * interval size`.
 *
 * @tsplus fluent ets/Schedule jittered
 * @tsplus fluent ets/ScheduleWithState jittered
 */
export function jittered_<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>,
  min: number,
  max: number
): Schedule.WithState<State, Env & HasRandom, In, Out> {
  return self.delayedEffect((duration) =>
    Random.next.map((random) => {
      const d = duration.milliseconds
      const jittered = d * min * (1 - random) + d * max * random
      return Duration(jittered)
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
 * @ets_data_first jittered_
 */
export function jittered(min: number, max: number) {
  return <State, Env, In, Out>(
    self: Schedule.WithState<State, Env, In, Out>
  ): Schedule.WithState<State, Env & HasRandom, In, Out> => self.jittered(min, max)
}

/**
 * Returns a new schedule that randomly modifies the size of the intervals of
 * this schedule.
 *
 * The new interval size is between `min * old interval size` and `max * old
 * interval size`.
 *
 * @tsplus fluent ets/Schedule jitteredDefault
 * @tsplus fluent ets/ScheduleWithState jitteredDefault
 */
export function jitteredDefault<State, Env, In, Out>(
  self: Schedule.WithState<State, Env, In, Out>
): Schedule.WithState<State, Env & HasRandom, In, Out> {
  return self.jittered(0.8, 1.2)
}
