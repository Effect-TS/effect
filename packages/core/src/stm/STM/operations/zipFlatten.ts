/**
 * Sequentially zips this transactional effect with the that transactional
 * effect.
 *
 * @tsplus pipeable-operator effect/core/stm/STM +
 * @tsplus static effect/core/stm/STM.Aspects zipFlatten
 * @tsplus pipeable effect/core/stm/STM zipFlatten
 * @category zipping
 * @since 1.0.0
 */
export function zipFlatten<R2, E2, A2>(that: STM<R2, E2, A2>) {
  return <R, E, A extends ReadonlyArray<any>>(
    self: STM<R, E, A>
  ): STM<R | R2, E | E2, readonly [...A, A2]> => self.zipWith(that, (a, a2) => [...a, a2])
}
