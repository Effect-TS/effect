import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import type { UIO } from "../../../Effect"
import type { Ref } from "../../definition"
import type { SynchronizedRef } from "../definition"

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function, which computes a return value for the modification if the function
 * is defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus fluent ets/Ref/Synchronized modifySome
 */
export function modifySome_<A, B>(
  self: SynchronizedRef<A>,
  def: B,
  pf: (a: A) => Option<Tuple<[B, A]>>,
  __tsplusTrace?: string
): UIO<B> {
  return (self as Ref<A>).modifySome(def, pf)
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function, which computes a return value for the modification if the function
 * is defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @ets_data_first modifySome_
 */
export const modifySome = Pipeable(modifySome_)
