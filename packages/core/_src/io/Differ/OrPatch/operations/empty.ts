import type { OrPatch } from "@effect/core/io/Differ/OrPatch/definition"
import { EmptyOrPatch } from "@effect/core/io/Differ/OrPatch/definition"

/**
 * Constructs an empty or patch.
 *
 * @tsplus static effect/core/io/Differ.OrPatch.Ops empty
 */
export function empty<Value, Value2, Patch, Patch2>(): OrPatch<Value, Value2, Patch, Patch2> {
  return new EmptyOrPatch()
}
