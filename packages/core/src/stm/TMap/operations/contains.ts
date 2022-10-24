import * as Option from "@fp-ts/data/Option"

/**
 * Tests whether or not map contains a key.
 *
 * @tsplus static effect/core/stm/TMap.Aspects contains
 * @tsplus pipeable effect/core/stm/TMap contains
 * @category elements
 * @since 1.0.0
 */
export function contains<K>(k: K) {
  return <V>(self: TMap<K, V>): STM<never, never, boolean> => self.get(k).map(Option.isSome)
}
