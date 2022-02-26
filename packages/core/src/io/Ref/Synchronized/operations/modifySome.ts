import type { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import type { Effect } from "../../../Effect"
import type { XRef } from "../../definition"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function, which computes a return value for the modification if the function
 * is defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @tsplus fluent ets/XSynchronized modifySome
 */
export function modifySome_<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  def: B,
  pf: (a: A) => Option<Tuple<[B, A]>>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, B> {
  return (self as XRef<RA, RB, EA, EB, A, A>).modifySome(def, pf)
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function, which computes a return value for the modification if the function
 * is defined on the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @ets_data_first modifySome_
 */
export function modifySome<A, B>(
  def: B,
  pf: (a: A) => Option<Tuple<[B, A]>>,
  __tsplusTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, B> => self.modifySome(def, pf)
}
