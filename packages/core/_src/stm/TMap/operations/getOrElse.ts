/**
 * Retrieves value associated with given key or default value, in case the key
 * isn't present.
 *
 * @tsplus fluent ets/TMap getOrElse
 */
export function getOrElse_<K, V>(self: TMap<K, V>, k: K, onNone: LazyArg<V>): USTM<V> {
  return self.get(k).map((_) => _.getOrElse(onNone))
}

/**
 * Retrieves value associated with given key or default value, in case the key
 * isn't present.
 *
 * @tsplus static ets/TMap/Aspects getOrElse
 */
export const getOrElse = Pipeable(getOrElse_)
