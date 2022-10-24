/**
 * Retrieves value associated with given key or default value, in case the key
 * isn't present.
 *
 * @tsplus static effect/core/stm/TMap.Aspects getOrElse
 * @tsplus pipeable effect/core/stm/TMap getOrElse
 * @category mutations
 * @since 1.0.0
 */
export function getOrElse<K, V>(k: K, onNone: LazyArg<V>) {
  return (self: TMap<K, V>): STM<never, never, V> =>
    self.get(k).map((option) => {
      switch (option._tag) {
        case "None": {
          return onNone()
        }
        case "Some": {
          return option.value
        }
      }
    })
}
