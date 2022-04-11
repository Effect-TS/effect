import { IFiberRefModifyAll } from "@effect/core/io/Effect/definition/primitives";

/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 *
 * @tsplus static ets/Effect/Ops getFiberRefs
 */
export function getFiberRefs(__tsplusTrace?: string): UIO<FiberRefs> {
  return new IFiberRefModifyAll(
    (_, fiberRefs) => Tuple(fiberRefs, fiberRefs),
    __tsplusTrace
  );
}
