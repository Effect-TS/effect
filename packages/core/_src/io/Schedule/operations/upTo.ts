/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus static effect/core/io/Schedule.Aspects upTo
 * @tsplus pipeable effect/core/io/Schedule upTo
 */
export function upTo(duration: Duration) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<Tuple<[State, Maybe<number>]>, Env, In, Out> => self < Schedule.recurUpTo(duration)
}
