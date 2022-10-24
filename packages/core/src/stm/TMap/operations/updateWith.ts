import * as Option from "@fp-ts/data/Option"

/**
 * Updates the mapping for the specified key with the specified function,
 * which takes the current value of the key as an input, if it exists, and
 * either returns `Some` with a new value to indicate to update the value in
 * the map or `None` to remove the value from the map. Returns `Some` with the
 * updated value or `None` if the value was removed from the map.
 *
 * @tsplus static effect/core/stm/TMap.Aspects updateWith
 * @tsplus pipeable effect/core/stm/TMap updateWith
 * @category mutations
 * @since 1.0.0
 */
export function updateWith<K, V>(k: K, f: (v: Option.Option<V>) => Option.Option<V>) {
  return (self: TMap<K, V>): STM<never, never, Option.Option<V>> =>
    self.get(k).flatMap((option) => {
      switch (option._tag) {
        case "None": {
          return self.delete(k).as(Option.none)
        }
        case "Some": {
          return self.put(k, option.value).as(Option.some(option.value))
        }
      }
    })
}
