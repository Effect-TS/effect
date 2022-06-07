/**
 * Makes an empty `TMap`.
 *
 * @tsplus static ets/TMap/Ops empty
 */
export function empty<K, V>(): USTM<TMap<K, V>> {
  return TMap.fromIterable(List.nil())
}
