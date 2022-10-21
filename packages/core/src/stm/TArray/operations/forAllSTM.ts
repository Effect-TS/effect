/**
 * Atomically evaluate the conjunction of a transactional predicate across the
 * members of the array.
 *
 * @tsplus static effect/core/stm/TArray.Aspects forAllSTM
 * @tsplus pipeable effect/core/stm/TArray forAllSTM
 */
export function forAllSTM<E, A>(f: (a: A) => STM<never, E, boolean>) {
  return (self: TArray<A>): STM<never, E, boolean> => self.countSTM(f).map((n) => n === self.length)
}
