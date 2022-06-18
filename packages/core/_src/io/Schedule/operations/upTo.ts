/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus fluent ets/Schedule upTo
 * @tsplus fluent ets/Schedule/WithState upTo
 */
export function upTo_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  duration: Duration
): Schedule<Tuple<[State, Maybe<number>]>, Env, In, Out> {
  return self < Schedule.upTo(duration)
}

/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus static ets/Schedule/Aspects upTo
 */
export const upTo = Pipeable(upTo_)
