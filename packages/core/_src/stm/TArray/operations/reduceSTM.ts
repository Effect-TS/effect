/**
 * Atomically folds using a transactional function.
 *
 * @tsplus static effect/core/stm/TArray.Aspects reduceSTM
 * @tsplus pipeable effect/core/stm/TArray reduceSTM
 */
export function reduceSTM<E, A, Z>(zero: Z, f: (z: Z, a: A) => STM<never, E, Z>) {
  return (self: TArray<A>): STM<never, E, Z> => self.toChunk.flatMap((as) => STM.reduce(as, zero, f))
}
