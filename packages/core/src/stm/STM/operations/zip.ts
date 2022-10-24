/**
 * Sequentially zips this value with the specified one.
 *
 * @tsplus static effect/core/stm/STM.Aspects zip
 * @tsplus pipeable effect/core/stm/STM zip
 * @category zipping
 * @since 1.0.0
 */
export function zip<R1, E1, A1>(that: STM<R1, E1, A1>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, readonly [A, A1]> =>
    self.zipWith(that, (a, b) => [a, b] as const)
}
