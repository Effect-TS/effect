import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @tsplus fluent ets/XRef set
 */
export function set_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  value: A,
  __tsplusTrace?: string
): Effect<RA, EA, void> {
  return concrete(self)._set(value)
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @ets_data_first set_
 */
export function set<A>(value: A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(self: XRef<RA, RB, EA, EB, A, A>): Effect<RA, EA, void> =>
    self.set(value)
}
