import type { Effect } from "../../../Effect"
import type { XRef } from "../../definition"
import type { XSynchronized } from "../definition"

/**
 * Atomically writes the specified value to the `XRef.Synchronized`, returning
 * the value immediately before modification.
 *
 * @tsplus fluent ets/XSynchronized getAndSet
 */
export function getAndSet_<RA, RB, EA, EB, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  value: A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return (self as XRef<RA, RB, EA, EB, A, A>).getAndSet(value)
}

/**
 * Atomically writes the specified value to the `XRef.Synchronized`, returning
 * the value immediately before modification.
 *
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(value: A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => self.getAndSet(value)
}
