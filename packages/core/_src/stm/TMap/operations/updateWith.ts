/**
 * Updates the mapping for the specified key with the specified function,
 * which takes the current value of the key as an input, if it exists, and
 * either returns `Some` with a new value to indicate to update the value in
 * the map or `None` to remove the value from the map. Returns `Some` with the
 * updated value or `None` if the value was removed from the map.
 *
 * @tsplus fluent ets/TMap updateWith
 */
export function updateWith_<K, V, R, E>(
  self: TMap<K, V>,
  k: K,
  f: (v: Option<V>) => Option<V>
): USTM<Option<V>> {
  return self.get(k).flatMap((_) =>
    f(_).fold(self.delete(k).as(Option.emptyOf<V>()), (v) => self.put(k, v).as(Option.some(v)))
  )
}

/**
 * Updates the mapping for the specified key with the specified function,
 * which takes the current value of the key as an input, if it exists, and
 * either returns `Some` with a new value to indicate to update the value in
 * the map or `None` to remove the value from the map. Returns `Some` with the
 * updated value or `None` if the value was removed from the map.
 *
 * @tsplus static ets/TMap/Aspects updateWith
 */
export const updateWith = Pipeable(updateWith_)
