/**
 * Get the index of the next entry that matches a transactional predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexWhereSTM
 * @tsplus pipeable effect/core/stm/TArray indexWhereSTM
 */
export function indexWhereSTM<E, A>(f: (a: A) => STM<never, E, boolean>) {
  return (self: TArray<A>): STM<never, E, number> => self.indexWhereFromSTM(f, 0)
}
