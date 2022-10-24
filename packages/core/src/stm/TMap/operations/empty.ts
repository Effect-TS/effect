import * as List from "@fp-ts/data/List"

/**
 * Makes an empty `TMap`.
 *
 * @tsplus static effect/core/stm/TMap.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export function empty<K, V>(): USTM<TMap<K, V>> {
  return TMap.fromIterable(List.nil())
}
