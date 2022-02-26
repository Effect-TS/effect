import type { Option } from "../../../../data/Option"
import type { Effect } from "../../../Effect"
import type { XRef } from "../../definition"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 *
 * @tsplus fluent ets/XSynchronized updateSome
 */
export function updateSome_<RA, RB, EA, EB, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, void> {
  return (self as XRef<RA, RB, EA, EB, A, A>).updateSome(pf)
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 *
 * @ets_data_first updateSome_
 */
export function updateSome<A>(pf: (a: A) => Option<A>, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, void> => self.updateSome(pf)
}
