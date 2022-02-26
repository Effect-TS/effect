import type { Effect } from "../../../Effect"
import type { XRef } from "../../definition"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function and
 * returns the updated value.
 *
 * @tsplus fluent ets/XSynchronized updateAndGet
 */
export function updateAndGet_<RA, RB, EA, EB, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return (self as XRef<RA, RB, EA, EB, A, A>).updateAndGet(f)
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function and
 * returns the updated value.
 *
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => self.updateAndGet(f)
}
