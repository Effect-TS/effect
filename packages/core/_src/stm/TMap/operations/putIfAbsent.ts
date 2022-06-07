/**
 * Stores new binding in the map if it does not already exist.
 *
 * @tsplus fluent ets/TMap putIfAbsent
 */
export function putIfAbsent_<K, V>(self: TMap<K, V>, k: K, v: V): USTM<void> {
  return self.get(k).flatMap((_) => _.fold(self.put(k, v), (_) => STM.unit))
}

/**
 * Stores new binding in the map if it does not already exist.
 *
 * @tsplus static ets/TMap/Aspects putIfAbsent
 */
export const putIfAbsent = Pipeable(putIfAbsent_)
