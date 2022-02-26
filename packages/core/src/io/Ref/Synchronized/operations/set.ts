import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Writes a new value to the `XRef.Synchronized`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @tsplus fluent ets/XSynchronized set
 */
export function set_<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  value: A,
  __tsplusTrace?: string
): Effect<RA, EA, void> {
  return self._set(value)
}

/**
 * Writes a new value to the `XRef.Synchronized`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @ets_data_first set_
 */
export function set<A>(value: A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): Effect<RA, EA, void> => self.set(value)
}
