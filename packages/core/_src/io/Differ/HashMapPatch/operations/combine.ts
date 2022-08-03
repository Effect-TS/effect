import type { HashMapPatch } from "@effect/core/io/Differ/HashMapPatch/definition"
import { AndThenHashMapPatch } from "@effect/core/io/Differ/HashMapPatch/definition"

/**
 * Combines two map patches to produce a new map patch that describes
 * applying their changes sequentially.
 *
 * @tsplus static effect/core/io/Differ.HashMapPatch.Aspects combine
 * @tsplus pipeable effect/core/io/Differ.HashMapPatch combine
 */
export function combine<Key, Value, Patch>(that: HashMapPatch<Key, Value, Patch>) {
  return (self: HashMapPatch<Key, Value, Patch>): HashMapPatch<Key, Value, Patch> =>
    new AndThenHashMapPatch(self, that)
}
