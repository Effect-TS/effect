import type { Effect } from "../../../Effect"
import type { XRef } from "../../definition"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function.
 *
 * @tsplus fluent ets/XSynchronized update
 */
export function update_<RA, RB, EA, EB, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, void> {
  return (self as XRef<RA, RB, EA, EB, A, A>).update(f)
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, void> => self.update(f)
}
