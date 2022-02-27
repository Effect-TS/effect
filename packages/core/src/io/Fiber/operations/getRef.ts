import type { UIO } from "../../Effect"
import type { FiberRef } from "../../FiberRef"
import type { Fiber } from "../definition"
import { realFiber } from "../definition"

/**
 * Gets the value of the fiber ref for this fiber, or the initial value of the
 * fiber ref, if the fiber is not storing the ref.
 *
 * @tsplus fluent ets/Fiber getRef
 * @tsplus fluent ets/RuntimeFiber getRef
 */
export function getRef_<E, A, K>(
  self: Fiber<E, A>,
  ref: FiberRef.Runtime<K>,
  __tsplusTrace?: string
): UIO<K> {
  realFiber(self)
  return self._getRef(ref)
}

/**
 * Gets the value of the fiber ref for this fiber, or the initial value of the
 * fiber ref, if the fiber is not storing the ref.
 *
 * @ets_data_first getRef_
 */
export function getRef<K>(ref: FiberRef.Runtime<K>, __tsplusTrace?: string) {
  return <E, A>(self: Fiber<E, A>): UIO<K> => self.getRef(ref)
}
