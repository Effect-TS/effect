/**
 * Sequentially zips this value with the specified one.
 *
 * @tsplus static effect/core/stm/STM.Aspects zip
 * @tsplus pipeable effect/core/stm/STM zip
 */
export function zip<R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, Tuple<[A, A1]>> =>
    self.zipWith(
      that,
      (a, b) => Tuple(a, b)
    )
}
