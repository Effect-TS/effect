/**
 * Collects all values stored in map.
 *
 * @tsplus fluent ets/TMap values
 */
export function values<K, V>(self: TMap<K, V>): USTM<List<V>> {
  return self.toList().map((_) => _.map((kv) => kv.get(1)))
}
