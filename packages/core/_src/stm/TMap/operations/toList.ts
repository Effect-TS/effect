/**
 * Collects all bindings into a list.
 *
 * @tsplus fluent ets/TMap toList
 */
export function toList<K, V>(self: TMap<K, V>): USTM<List<Tuple<[K, V]>>> {
  return self.fold(List.empty<Tuple<[K, V]>>(), (acc, kv) => acc.prepend(kv).asList())
}
