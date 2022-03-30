import type { UIO } from "../../../Effect"
import type { Ref } from "../../definition"
import type { SynchronizedRef } from "../definition"

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @tsplus fluent ets/Ref/Synchronized getAndUpdate
 */
export function getAndUpdate_<A>(
  self: SynchronizedRef<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): UIO<A> {
  return (self as Ref<A>).getAndUpdate(f)
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * returning the value immediately before modification.
 */
export const getAndUpdate = Pipeable(getAndUpdate_)
