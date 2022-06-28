/**
 * Atomically updates all values using a transactional function.
 *
 * @tsplus static effect/core/stm/TMap.Aspects transformValuesSTM
 * @tsplus pipeable effect/core/stm/TMap transformValuesSTM
 */
export function transformValuesSTM<V, R, E>(f: (v: V) => STM<R, E, V>) {
  return <K>(self: TMap<K, V>): STM<R, E, void> =>
    self.transformSTM((kv) => f(kv.get(1)).map((_) => Tuple(kv.get(0), _)))
}
