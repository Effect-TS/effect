import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Returns a new schedule that performs a geometric intersection on the
 * intervals defined by both schedules.
 *
 * @tsplus pipeable-operator effect/core/io/Schedule &&
 * @tsplus static effect/core/io/Schedule intersect
 * @tsplus pipeable effect/core/io/Schedule intersect
 */
export function intersect<State1, Env1, In1, Out2>(
  that: Schedule<State1, Env1, In1, Out2>
) {
  return <State, Env, In, Out>(self: Schedule<State, Env, In, Out>): Schedule<
    Tuple<[State, State1]>,
    Env | Env1,
    In & In1,
    MergeTuple<Out, Out2>
  > => self.intersectWith(that, (x, y) => x.intersect(y))
}
