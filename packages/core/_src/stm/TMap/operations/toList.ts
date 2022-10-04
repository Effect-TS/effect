/**
 * Collects all bindings into a list.
 *
 * @tsplus getter effect/core/stm/TMap toList
 */
export function toList<K, V>(self: TMap<K, V>): USTM<List<readonly [K, V]>> {
  return self.fold(List.empty<readonly [K, V]>(), (acc, kv) => acc.prepend(kv).toList)
}
