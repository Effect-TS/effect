import type { Duration } from "@fp-ts/data/Duration"
import type { Option } from "@fp-ts/data/Option"

/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @tsplus static effect/core/io/Schedule.Aspects resetAfter
 * @tsplus pipeable effect/core/io/Schedule resetAfter
 * @category mutations
 * @since 1.0.0
 */
export function resetAfter(duration: Duration) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<readonly [State, Option<number>], Env, In, Out> => {
    return self
      .intersect(Schedule.elapsed)
      .resetWhen((t) => t[1] >= duration)
      .map((out) => out[0])
  }
}
