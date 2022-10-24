/**
 * Atomically updates all values using a transactional function.
 *
 * @tsplus static effect/core/stm/TMap.Aspects transformValuesSTM
 * @tsplus pipeable effect/core/stm/TMap transformValuesSTM
 * @category mutations
 * @since 1.0.0
 */
export function transformValuesSTM<V, R, E>(f: (v: V) => STM<R, E, V>) {
  return <K>(self: TMap<K, V>): STM<R, E, void> =>
    self.transformSTM((kv) => f(kv[1]).map((_) => [kv[0], _]))
}
