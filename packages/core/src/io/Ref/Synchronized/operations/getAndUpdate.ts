import type { Effect } from "../../../Effect"
import type { XRef } from "../../definition"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @tsplus fluent ets/XSynchronized getAndUpdate
 */
export function getAndUpdate_<RA, RB, EA, EB, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return (self as XRef<RA, RB, EA, EB, A, A>).getAndUpdate(f)
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => self.getAndUpdate(f)
}
