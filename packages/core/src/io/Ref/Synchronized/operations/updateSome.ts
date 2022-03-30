import type { Option } from "../../../../data/Option"
import type { UIO } from "../../../Effect"
import type { Ref } from "../../definition"
import type { SynchronizedRef } from "../definition"

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 *
 * @tsplus fluent ets/Ref/Synchronized updateSome
 */
export function updateSome_<A>(
  self: SynchronizedRef<A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): UIO<void> {
  return (self as Ref<A>).updateSome(pf)
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 *
 * @ets_data_first updateSome_
 */
export const updateSome = Pipeable(updateSome_)
