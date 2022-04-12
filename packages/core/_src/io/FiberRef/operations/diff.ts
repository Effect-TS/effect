import { concreteFiberRef } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal";

/**
 * Constructs a patch describing the updates to a value from an old value and
 * a new value.
 *
 * @tsplus fluent ets/FiberRef diff
 */
export function diff_<Value, Patch>(self: FiberRef.WithPatch<Value, Patch>, oldValue: Value, newValue: Value): Patch {
  concreteFiberRef(self);
  return self._diff(oldValue, newValue) as Patch;
}

/**
 * Constructs a patch describing the updates to a value from an old value and
 * a new value.
 *
 * @tsplus static ets/FiberRef/Aspects diff
 */
export const diff = Pipeable(diff_);
