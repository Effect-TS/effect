/**
 * Atomically updates all values using a transactional function.
 *
 * @tsplus fluent ets/TMap transformValuesSTM
 */
export function transformValuesSTM_<K, V, R, E>(
  self: TMap<K, V>,
  f: (v: V) => STM<R, E, V>
): STM<R, E, void> {
  return self.transformSTM((kv) => f(kv.get(1)).map((_) => Tuple(kv.get(0), _)))
}

/**
 * Atomically updates all values using a transactional function.
 *
 * @tsplus static ets/TMap/Aspects transformValuesSTM
 */
export const transformValuesSTM = Pipeable(transformValuesSTM_)
