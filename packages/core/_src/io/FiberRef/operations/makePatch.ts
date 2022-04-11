/**
 * Creates a new `FiberRef` with the specified initial value, using the
 * specified patch type to combine updates to the value in a compositional
 * way.
 *
 * @tsplus static ets/FiberRef/Ops makePatch
 */
export function makePatch<Value, Patch>(
  initialValue: Value,
  diff: (oldValue: Value, newValue: Value) => Patch,
  combine: (first: Patch, second: Patch) => Patch,
  patch: (patch: Patch) => (oldValue: Value) => Value,
  fork: Patch,
  __tsplusTrace?: string
): UIO<FiberRef.WithPatch<Value, Patch>> {
  return Effect.suspendSucceed(() => {
    const ref = FiberRef.unsafeMakePatch(initialValue, diff, combine, patch, fork);
    return ref.update(identity).as(ref);
  });
}
