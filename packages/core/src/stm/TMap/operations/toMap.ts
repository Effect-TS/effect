/**
 * Collects all bindings into a map.
 *
 * @tsplus getter effect/core/stm/TMap toMap
 */
export function toMap<K, V>(self: TMap<K, V>): USTM<Map<K, V>> {
  return self.fold(new Map<K, V>(), (acc, kv) => acc.set(kv[0], kv[1]))
}
