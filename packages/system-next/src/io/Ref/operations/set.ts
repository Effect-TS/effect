import type { XRef } from "../definition"
import { concrete } from "../definition"
import type { Effect } from "./_internal/effect"

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  value: A
): Effect<RA, EA, void> {
  return concrete(self).set(value)
}

/**
 * Writes a new value to the `XRef`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @ets_data_first set_
 */
export function set<A>(value: A) {
  return <RA, RB, EA, EB>(self: XRef<RA, RB, EA, EB, A, A>): Effect<RA, EA, void> =>
    set_(self, value)
}
