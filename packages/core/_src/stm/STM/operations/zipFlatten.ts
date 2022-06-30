import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Sequentially zips this transactional effect with the that transactional
 * effect.
 *
 * @tsplus pipeable-operator effect/core/stm/STM +
 * @tsplus static effect/core/stm/STM.Aspects zipFlatten
 * @tsplus pipeable effect/core/stm/STM zipFlatten
 */
export function zipFlatten<R2, E2, A2>(that: LazyArg<STM<R2, E2, A2>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R2, E | E2, MergeTuple<A, A2>> =>
    self.zipWith(
      that,
      Tuple.mergeTuple
    )
}
