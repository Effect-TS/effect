/**
 * folds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @tsplus static effect/core/stm/TMap.Aspects foldSTM
 * @tsplus pipeable effect/core/stm/TMap foldSTM
 */
export function foldSTM<K, V, R, E, A>(
  zero: A,
  op: (a: A, kv: Tuple<[K, V]>) => STM<R, E, A>
) {
  return (self: TMap<K, V>): STM<R, E, A> => self.toChunk.flatMap((_) => STM.reduce(_, zero, op))
}
