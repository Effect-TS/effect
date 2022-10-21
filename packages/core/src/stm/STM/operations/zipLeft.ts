/**
 * Sequentially zips this value with the specified one, discarding the second
 * element of the tuple.
 *
 * @tsplus pipeable.operator effect/core/stm/STM <
 * @tsplus static effect/core/stm/STM.Aspects zipLeft
 * @tsplus pipeable effect/core/stm/STM zipLeft
 */
export function zipLeft<R1, E1, A1>(that: STM<R1, E1, A1>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A> => self.zipWith(that, (a, _) => a)
}
