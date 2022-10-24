import * as List from "@fp-ts/data/List"

/**
 * Collects all values stored in map.
 *
 * @tsplus getter effect/core/stm/TMap values
 * @category getters
 * @since 1.0.0
 */
export function values<K, V>(self: TMap<K, V>): USTM<List.List<V>> {
  return self.toList.map(List.map((kv) => kv[1]))
}
