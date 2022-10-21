/**
 * Retrieves value associated with given key or default value, in case the key
 * isn't present.
 *
 * @tsplus static effect/core/stm/TMap.Aspects getOrElse
 * @tsplus pipeable effect/core/stm/TMap getOrElse
 */
export function getOrElse<K, V>(k: K, onNone: LazyArg<V>) {
  return (self: TMap<K, V>): STM<never, never, V> => self.get(k).map((_) => _.getOrElse(onNone))
}
