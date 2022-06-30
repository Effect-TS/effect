/**
 * Count the values in the array matching a transactional predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects countSTM
 * @tsplus pipeable effect/core/stm/TArray countSTM
 */
export function countSTM<E, A>(f: (a: A) => STM<never, E, boolean>) {
  return (self: TArray<A>): STM<never, E, number> =>
    self.reduceSTM(0, (n, a) => f(a).map((result) => (result ? n + 1 : n)))
}
