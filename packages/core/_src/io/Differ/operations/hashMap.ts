import { HashMapPatch } from "@effect/core/io/Differ/HashMapPatch/definition"

/**
 * Constructs a differ that knows how to diff a `HashMap` of keys and values given
 * a differ that knows how to diff the values.
 *
 * @tsplus static effect/core/io/Differ.Ops hashMap
 */
export function hashMap<Key, Value, Patch>(
  differ: Differ<Value, Patch>
): Differ<HashMap<Key, Value>, HashMapPatch<Key, Value, Patch>> {
  return Differ.make({
    empty: HashMapPatch.empty(),
    combine: (first, second) => first.combine(second),
    diff: (oldValue, newValue) => HashMapPatch.diff(oldValue, newValue, differ),
    patch: (patch, oldValue) => patch.apply(oldValue, differ)
  })
}
