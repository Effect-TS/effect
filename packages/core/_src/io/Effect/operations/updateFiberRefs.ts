import { IFiberRefModifyAll } from "@effect/core/io/Effect/definition/primitives"

/**
 * Updates the `FiberRef` values for the fiber running this effect using the
 * specified function.
 *
 * @tsplus static ets/Effect/Ops updateFiberRefs
 */
export function updateFiberRefs(
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs) => FiberRefs,
  __tsplusTrace?: string
): Effect.UIO<void> {
  return new IFiberRefModifyAll(
    (fiberId, fiberRefs) => Tuple(undefined, f(fiberId, fiberRefs)),
    __tsplusTrace
  )
}
