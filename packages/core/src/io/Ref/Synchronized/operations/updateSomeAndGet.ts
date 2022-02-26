import type { Option } from "../../../../data/Option"
import type { Effect } from "../../../Effect"
import type { XRef } from "../../definition"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns the
 * old value without changing it.
 *
 * @tsplus fluent ets/XSynchronized updateSomeAndGet
 */
export function updateSomeAndGet_<RA, RB, EA, EB, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return (self as XRef<RA, RB, EA, EB, A, A>).updateSomeAndGet(pf)
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns the
 * old value without changing it.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(pf: (a: A) => Option<A>, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => self.updateSomeAndGet(pf)
}
