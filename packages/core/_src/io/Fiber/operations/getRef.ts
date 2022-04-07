import { realFiber } from "@effect/core/io/Fiber/definition";

/**
 * Gets the value of the fiber ref for this fiber, or the initial value of the
 * fiber ref, if the fiber is not storing the ref.
 *
 * @tsplus fluent ets/Fiber getRef
 * @tsplus fluent ets/RuntimeFiber getRef
 */
export function getRef_<E, A, K>(
  self: Fiber<E, A>,
  ref: FiberRef<K>,
  __tsplusTrace?: string
): UIO<K> {
  realFiber(self);
  return self._getRef(ref);
}

/**
 * Gets the value of the fiber ref for this fiber, or the initial value of the
 * fiber ref, if the fiber is not storing the ref.
 *
 * @tsplus static ets/Fiber/Aspects getRef
 */
export const getRef = Pipeable(getRef_);
