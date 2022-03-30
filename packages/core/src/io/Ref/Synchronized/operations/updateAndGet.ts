import type { UIO } from "../../../Effect"
import type { Ref } from "../../definition"
import type { SynchronizedRef } from "../definition"

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function and
 * returns the updated value.
 *
 * @tsplus fluent ets/Ref/Synchronized updateAndGet
 */
export function updateAndGet_<A>(
  self: SynchronizedRef<A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): UIO<A> {
  return (self as Ref<A>).updateAndGet(f)
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function and
 * returns the updated value.
 */
export const updateAndGet = Pipeable(updateAndGet_)
