import * as List from "@fp-ts/data/List"

/**
 * Collects all keys stored in map.
 *
 * @tsplus getter effect/core/stm/TMap keys
 * @category getters
 * @since 1.0.0
 */
export function keys<K, V>(self: TMap<K, V>): USTM<List.List<K>> {
  return self.toList.map(List.map((kv) => kv[0]))
}
