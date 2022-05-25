/**
 * Creates a new `FiberRef` with the specified initial value, using the
 * specified patch type to combine updates to the value in a compositional
 * way.
 *
 * @tsplus static ets/FiberRef/Ops makePatch
 */
export function makePatch<Value, Patch>(
  initial: Value,
  diff: (oldValue: Value, newValue: Value) => Patch,
  combine: (first: Patch, second: Patch) => Patch,
  patch: (patch: Patch) => (oldValue: Value) => Value,
  fork: Patch,
  __tsplusTrace?: string
): Effect<Has<Scope>, never, FiberRef<Value, Patch>> {
  return FiberRef.makeWith(
    FiberRef.unsafeMakePatch(initial, diff, combine, patch, fork)
  )
}
