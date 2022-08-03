import {
  AddHashSetPatch,
  HashSetPatch,
  RemoveHashSetPatch
} from "@effect/core/io/Differ/HashSetPatch/definition"

/**
 * Constructs a set patch from a new set of values.
 *
 * @tsplus static effect/core/io/Differ.HashSetPatch.Ops diff
 */
export function diff<Value>(
  oldValue: HashSet<Value>,
  newValue: HashSet<Value>
): HashSetPatch<Value> {
  const { tuple: [removed, patch] } = newValue.reduce(
    Tuple(oldValue, HashSetPatch.empty<Value>()),
    ({ tuple: [set, patch] }, value) => {
      if (set.has(value)) {
        return Tuple(set.remove(value), patch)
      }
      return Tuple(set, patch.combine(new AddHashSetPatch(value)))
    }
  )
  return removed.reduce(patch, (patch, value) => patch.combine(new RemoveHashSetPatch(value)))
}
