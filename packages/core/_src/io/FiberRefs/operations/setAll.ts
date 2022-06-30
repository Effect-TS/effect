/**
 * Sets the value of each `FiberRef` for the fiber running this effect to the
 * value in this collection of `FiberRef` values.
 *
 * @tsplus getter effect/core/io/FiberRefs setAll
 */
export function setAll(self: FiberRefs, __tsplusTrace?: string): Effect<never, never, void> {
  return Effect.forEachDiscard(self.fiberRefs, (fiberRef) => fiberRef.set(self.getOrDefault(fiberRef)))
}
