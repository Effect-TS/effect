/**
 * Collects all keys stored in map.
 *
 * @tsplus getter ets/TMap keys
 */
export function keys<K, V>(self: TMap<K, V>): USTM<List<K>> {
  return self.toList.map((_) => _.map((kv) => kv.get(0)))
}
