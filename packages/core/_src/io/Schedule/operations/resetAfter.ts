/**
 * Return a new schedule that automatically resets the schedule to its initial
 * state after some time of inactivity defined by `duration`.
 *
 * @tsplus static effect/core/io/Schedule.Aspects resetAfter
 * @tsplus pipeable effect/core/io/Schedule resetAfter
 */
export function resetAfter(duration: Duration) {
  return <State, Env, In, Out>(
    self: Schedule<State, Env, In, Out>
  ): Schedule<Tuple<[State, Maybe<number>]>, Env, In, Out> => {
    return self
      .intersect(Schedule.elapsed)
      .resetWhen((t) => t.get(1) >= duration)
      .map((out) => out.get(0))
  }
}
