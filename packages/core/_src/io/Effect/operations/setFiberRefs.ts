/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 *
 * @tsplus static ets/Effect/Ops setFiberRefs
 */
export function setFiberRefs(fiberRefs: LazyArg<FiberRefs>, __tsplusTrace?: string): UIO<void> {
  return Effect.suspendSucceed(fiberRefs().setAll());
}
