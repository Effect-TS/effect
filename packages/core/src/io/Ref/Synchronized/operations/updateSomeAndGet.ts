import type { Option } from "../../../../data/Option"
import type { UIO } from "../../../Effect"
import type { Ref } from "../../definition"
import type { SynchronizedRef } from "../definition"

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns the
 * old value without changing it.
 *
 * @tsplus fluent ets/Ref/Synchronized updateSomeAndGet
 */
export function updateSomeAndGet_<A>(
  self: SynchronizedRef<A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): UIO<A> {
  return (self as Ref<A>).updateSomeAndGet(pf)
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns the
 * old value without changing it.
 */
export const updateSomeAndGet = Pipeable(updateSomeAndGet_)
