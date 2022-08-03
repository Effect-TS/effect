import type { HashSetPatch } from "@effect/core/io/Differ/HashSetPatch/definition"
import { EmptyHashSetPatch } from "@effect/core/io/Differ/HashSetPatch/definition"

/**
 * Constructs an empty set patch.
 *
 * @tsplus static effect/core/io/Differ.HashSetPatch.Ops empty
 */
export function empty<Value>(): HashSetPatch<Value> {
  return new EmptyHashSetPatch()
}
