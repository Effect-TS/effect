/**
 * folds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @tsplus fluent ets/TMap foldSTM
 */
export function foldSTM_<K, V, R, E, A>(
  self: TMap<K, V>,
  zero: A,
  op: (a: A, kv: Tuple<[K, V]>) => STM<R, E, A>
): STM<R, E, A> {
  return self.toChunk.flatMap((_) => STM.reduce(_, zero, op))
}

/**
 * folds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @tsplus static ets/TMap/Aspects foldSTM
 */
export const foldSTM = Pipeable(foldSTM_)
