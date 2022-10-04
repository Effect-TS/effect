/**
 * Returns a new schedule that performs a geometric union on the intervals
 * defined by both schedules.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule ||
 * @tsplus static effect/core/io/Schedule.Aspects union
 * @tsplus pipeable effect/core/io/Schedule union
 */
export function union<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    readonly [State, State1],
    Env | Env1,
    In & In1,
    readonly [Out, Out2]
  > => self.unionWith(that, (x, y) => x.union(y))
}
