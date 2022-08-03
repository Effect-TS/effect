import type { OrPatch } from "@effect/core/io/Differ/OrPatch/definition"
import {
  EmptyOrPatch,
  SetLeftOrPatch,
  SetRightOrPatch,
  UpdateLeftOrPatch,
  UpdateRightOrPatch
} from "@effect/core/io/Differ/OrPatch/definition"

/**
 * Constructs an `OrPatch` from a new and old value and a differ for the
 * values.
 *
 * @tsplus static effect/core/io/Differ.OrPatch.Ops diff
 */
export function diff<Value, Value2, Patch, Patch2>(
  oldValue: Either<Value, Value2>,
  newValue: Either<Value, Value2>,
  left: Differ<Value, Patch>,
  right: Differ<Value2, Patch2>
): OrPatch<Value, Value2, Patch, Patch2> {
  switch (oldValue._tag) {
    case "Left": {
      switch (newValue._tag) {
        case "Left": {
          const valuePatch = left.diff(oldValue.left, newValue.left)
          if (Equals.equals(valuePatch, left.empty)) {
            return new EmptyOrPatch()
          }
          return new UpdateLeftOrPatch(valuePatch)
        }
        case "Right": {
          return new SetRightOrPatch(newValue.right)
        }
      }
    }
    case "Right": {
      switch (newValue._tag) {
        case "Left": {
          return new SetLeftOrPatch(newValue.left)
        }
        case "Right": {
          const valuePatch = right.diff(oldValue.right, newValue.right)
          if (Equals.equals(valuePatch, right.empty)) {
            return new EmptyOrPatch()
          }
          return new UpdateRightOrPatch(valuePatch)
        }
      }
    }
  }
}
