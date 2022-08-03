import { EmptyHashMapPatch } from "@effect/core/io/Differ/HashMapPatch/definition"
import type { HashMapPatch } from "@effect/core/io/Differ/HashMapPatch/definition"

/**
 * Constructs an empty map patch.
 *
 * @tsplus static effect/core/io/Differ.HashMapPatch.Ops empty
 */
export function empty<Key, Value, Patch>(): HashMapPatch<Key, Value, Patch> {
  return new EmptyHashMapPatch()
}
