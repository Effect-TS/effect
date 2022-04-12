import { FiberRefInternal } from "@effect/core/io/FiberRef/operations/_internal/FiberRefInternal";

/**
 * @tsplus static ets/FiberRef/Ops unsafeMakePatch
 */
export function unsafeMakePatch<Value, Patch>(
  initial: Value,
  diff: (oldValue: Value, newValue: Value) => Patch,
  combine: (first: Patch, second: Patch) => Patch,
  patch: (patch: Patch) => (oldValue: Value) => Value,
  fork: Patch
): FiberRef.WithPatch<Value, Patch> {
  return new FiberRefInternal(
    initial,
    diff,
    combine,
    patch,
    fork
  );
}
