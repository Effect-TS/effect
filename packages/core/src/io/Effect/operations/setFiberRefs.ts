/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 *
 * @tsplus static effect/core/io/Effect.Ops setFiberRefs
 * @category mutations
 * @since 1.0.0
 */
export function setFiberRefs(fiberRefs: FiberRefs): Effect<never, never, void> {
  return Effect.suspendSucceed(fiberRefs.setAll)
}
