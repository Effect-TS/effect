/**
 * Tests whether or not map contains a key.
 *
 * @tsplus fluent ets/TMap contains
 */
export function contains_<K, V>(self: TMap<K, V>, k: K): USTM<boolean> {
  return self.get(k).map((_) => _.isSome())
}

/**
 * Tests whether or not map contains a key.
 *
 * @tsplus static ets/TMap/Aspects contains
 */
export const contains = Pipeable(contains_)
