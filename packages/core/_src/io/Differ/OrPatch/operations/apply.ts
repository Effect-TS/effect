import type { OrPatch } from "@effect/core/io/Differ/OrPatch/definition"
import { orPatchInstruction } from "@effect/core/io/Differ/OrPatch/definition"

/**
 * Applies an or patch to a value to produce a new value which represents
 * the original value updated with the changes described by this patch.
 *
 * @tsplus static effect/core/io/Differ.OrPatch.Aspects apply
 * @tsplus pipeable effect/core/io/Differ.OrPatch apply
 */
export function apply<Value, Value2, Patch, Patch2>(
  oldValue: Either<Value, Value2>,
  left: Differ<Value, Patch>,
  right: Differ<Value2, Patch2>
) {
  return (self: OrPatch<Value, Value2, Patch, Patch2>): Either<Value, Value2> =>
    applyLoop(left, right, oldValue, List(self))
}

/**
 * @tsplus tailRec
 */
function applyLoop<Value, Value2, Patch, Patch2>(
  left: Differ<Value, Patch>,
  right: Differ<Value2, Patch2>,
  either: Either<Value, Value2>,
  patches: List<OrPatch<Value, Value2, Patch, Patch2>>
): Either<Value, Value2> {
  if (patches.isNil()) {
    return either
  }
  const patch = orPatchInstruction(patches.head)
  const nextPatches = patches.tail
  switch (patch._tag) {
    case "AndThen": {
      return applyLoop(left, right, either, nextPatches.prepend(patch.second).prepend(patch.first))
    }
    case "Empty": {
      return applyLoop(left, right, either, nextPatches)
    }
    case "UpdateLeft": {
      switch (either._tag) {
        case "Left": {
          return applyLoop(
            left,
            right,
            Either.left(left.patch(patch.patch, either.left)),
            nextPatches
          )
        }
        case "Right": {
          return applyLoop(left, right, either, nextPatches)
        }
      }
    }
    case "UpdateRight": {
      switch (either._tag) {
        case "Left": {
          return applyLoop(left, right, either, nextPatches)
        }
        case "Right": {
          return applyLoop(
            left,
            right,
            Either.right(right.patch(patch.patch, either.right)),
            nextPatches
          )
        }
      }
    }
    case "SetLeft": {
      return applyLoop(left, right, Either.left(patch.value), nextPatches)
    }
    case "SetRight": {
      return applyLoop(left, right, Either.right(patch.value), nextPatches)
    }
  }
}
