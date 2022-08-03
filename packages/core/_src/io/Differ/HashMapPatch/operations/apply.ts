import { hashMapPatchInstruction } from "@effect/core/io/Differ/HashMapPatch/definition"
import type { HashMapPatch } from "@effect/core/io/Differ/HashMapPatch/definition"

/**
 * Applies a map patch to a map of keys and values to produce a new map of
 * keys and values values which represents the original map of keys and
 * values updated with the changes described by this patch.
 *
 * @tsplus static effect/core/io/Differ.HashMapPatch.Aspects apply
 * @tsplus pipeable effect/core/io/Differ.HashMapPatch apply
 */
export function apply<Key, Value, Patch>(
  oldValue: HashMap<Key, Value>,
  differ: Differ<Value, Patch>
) {
  return (self: HashMapPatch<Key, Value, Patch>): HashMap<Key, Value> =>
    applyLoop(differ, oldValue, List(self))
}

/**
 * @tsplus tailRec
 */
function applyLoop<Key, Value, Patch>(
  differ: Differ<Value, Patch>,
  map: HashMap<Key, Value>,
  patches: List<HashMapPatch<Key, Value, Patch>>
): HashMap<Key, Value> {
  if (patches.isNil()) {
    return map
  }
  const patch = hashMapPatchInstruction(patches.head)
  const nextPatches = patches.tail
  switch (patch._tag) {
    case "Add": {
      return applyLoop(differ, map.set(patch.key, patch.value), nextPatches)
    }
    case "AndThen": {
      return applyLoop(differ, map, nextPatches.prepend(patch.second).prepend(patch.first))
    }
    case "Empty": {
      return applyLoop(differ, map, nextPatches)
    }
    case "Remove": {
      return applyLoop(differ, map.remove(patch.key), nextPatches)
    }
    case "Update": {
      return applyLoop(
        differ,
        map.get(patch.key).fold(
          map,
          (oldValue) => map.set(patch.key, differ.patch(patch.patch, oldValue))
        ),
        nextPatches
      )
    }
  }
}
