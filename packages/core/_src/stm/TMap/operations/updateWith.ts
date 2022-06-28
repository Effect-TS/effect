/**
 * Updates the mapping for the specified key with the specified function,
 * which takes the current value of the key as an input, if it exists, and
 * either returns `Some` with a new value to indicate to update the value in
 * the map or `None` to remove the value from the map. Returns `Some` with the
 * updated value or `None` if the value was removed from the map.
 *
 * @tsplus static effect/core/stm/TMap.Aspects updateWith
 * @tsplus pipeable effect/core/stm/TMap updateWith
 */
export function updateWith<K, V>(k: K, f: (v: Maybe<V>) => Maybe<V>) {
  return (self: TMap<K, V>): STM<never, never, Maybe<V>> =>
    self.get(k).flatMap((_) =>
      f(_).fold(self.delete(k).as(Maybe.emptyOf<V>()), (v) => self.put(k, v).as(Maybe.some(v)))
    )
}
