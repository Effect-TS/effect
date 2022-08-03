import type { OrPatch } from "@effect/core/io/Differ/OrPatch/definition"
import { AndThenOrPatch } from "@effect/core/io/Differ/OrPatch/definition"

/**
 * Combines two or patches to produce a new or patch that describes applying
 * their changes sequentially.
 *
 * @tsplus static effect/core/io/Differ.OrPatch.Aspects combine
 * @tsplus pipeable effect/core/io/Differ.OrPatch combine
 */
export function combine<Value, Value2, Patch, Patch2>(that: OrPatch<Value, Value2, Patch, Patch2>) {
  return (self: OrPatch<Value, Value2, Patch, Patch2>): OrPatch<Value, Value2, Patch, Patch2> =>
    new AndThenOrPatch(self, that)
}
