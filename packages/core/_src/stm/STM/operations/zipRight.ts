/**
 * Sequentially zips this value with the specified one, discarding the first
 * element of the tuple.
 *
 * @tsplus pipeable-operator effect/core/stm/STM >
 * @tsplus static effect/core/stm/STM.Aspects zipRight
 * @tsplus pipeable effect/core/stm/STM zipRight
 */
export function zipRight<R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A1> => self.zipWith(that, (_, b) => b)
}
