import type { Duration } from "@fp-ts/data/Duration"
import type { Option } from "@fp-ts/data/Option"

/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus static effect/core/io/Schedule.Aspects upTo
 * @tsplus pipeable effect/core/io/Schedule upTo
 * @category mutations
 * @since 1.0.0
 */
export function upTo(duration: Duration) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<readonly [State, Option<number>], Env, In, Out> =>
    self.zipLeft(Schedule.recurUpTo(duration))
}
