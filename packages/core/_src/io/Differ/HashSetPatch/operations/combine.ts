import type { HashSetPatch } from "@effect/core/io/Differ/HashSetPatch/definition"
import { AndThenHashSetPatch } from "@effect/core/io/Differ/HashSetPatch/definition"

/**
 * Combines two set patches to produce a new set patch that describes
 * applying their changes sequentially.
 *
 * @tsplus static effect/core/io/Differ.HashSetPatch.Aspects combine
 * @tsplus pipeable effect/core/io/Differ.HashSetPatch combine
 */
export function combine<Value>(that: HashSetPatch<Value>) {
  return (self: HashSetPatch<Value>): HashSetPatch<Value> => new AndThenHashSetPatch(self, that)
}
