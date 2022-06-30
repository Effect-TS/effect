import { concreteFiberRef } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal"

/**
 * Applies a patch to an old value to produce a new value that is equal to the
 * old value with the updates described by the patch.
 *
 * @tsplus fluent effect/core/io/FiberRef patch
 */
export function patch_<Value, Patch>(self: FiberRef<Value, Patch>, patch: Patch) {
  return (oldValue: Value): Value => {
    concreteFiberRef(self)
    return self._patch(patch)(oldValue)
  }
}

/**
 * Applies a patch to an old value to produce a new value that is equal to the
 * old value with the updates described by the patch.
 *
 * @tsplus static effect/core/io/FiberRef.Aspects patch
 */
export function patch<Value, Patch>(patch: Patch, value: Value) {
  return (self: FiberRef<Value, Patch>): Value => self.patch(patch)(value)
}
