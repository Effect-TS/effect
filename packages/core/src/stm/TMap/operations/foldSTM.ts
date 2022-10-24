/**
 * Atomically folds using a transactional function.
 *
 * @tsplus static effect/core/stm/TMap.Aspects foldSTM
 * @tsplus pipeable effect/core/stm/TMap foldSTM
 * @category folding
 * @since 1.0.0
 */
export function foldSTM<K, V, R, E, A>(
  zero: A,
  op: (a: A, kv: readonly [K, V]) => STM<R, E, A>
) {
  return (self: TMap<K, V>): STM<R, E, A> => self.toChunk.flatMap((_) => STM.reduce(_, zero, op))
}
