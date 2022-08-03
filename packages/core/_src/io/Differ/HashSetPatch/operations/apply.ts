import type { HashSetPatch } from "@effect/core/io/Differ/HashSetPatch/definition"
import { hashSetPatchInstruction } from "@effect/core/io/Differ/HashSetPatch/definition"

/**
 * Applies a set patch to a set of values to produce a new set of values
 * which represents the original set of values updated with the changes
 * described by this patch.
 *
 * @tsplus static effect/core/io/Differ.HashSetPatch.Aspects apply
 * @tsplus pipeable effect/core/io/Differ.HashSetPatch apply
 */
export function apply<Value>(oldValue: HashSet<Value>) {
  return (self: HashSetPatch<Value>): HashSet<Value> => applyLoop(oldValue, List(self))
}

/**
 * @tsplus tailRec
 */
function applyLoop<Value>(set: HashSet<Value>, patches: List<HashSetPatch<Value>>): HashSet<Value> {
  if (patches.isNil()) {
    return set
  }
  const patch = hashSetPatchInstruction(patches.head)
  const nextPatches = patches.tail
  switch (patch._tag) {
    case "Add": {
      return applyLoop(set.add(patch.value), nextPatches)
    }
    case "AndThen": {
      return applyLoop(set, nextPatches.prepend(patch.second).prepend(patch.first))
    }
    case "Empty": {
      return applyLoop(set, nextPatches)
    }
    case "Remove": {
      return applyLoop(set.remove(patch.value), nextPatches)
    }
  }
}
