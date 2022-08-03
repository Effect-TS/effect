import { HashSetPatch } from "@effect/core/io/Differ/HashSetPatch/definition"

/**
 * Constructs a differ that knows how to diff a `HashSet` of values.
 *
 * @tsplus static effect/core/io/Differ.Ops hashSet
 */
export function hashSet<Value>(): Differ<HashSet<Value>, HashSetPatch<Value>> {
  return Differ.make({
    empty: HashSetPatch.empty(),
    combine: (first, second) => first.combine(second),
    diff: (oldValue, newValue) => HashSetPatch.diff(oldValue, newValue),
    patch: (patch, oldValue) => patch.apply(oldValue)
  })
}
