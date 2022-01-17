import type { XSynchronized } from "../definition"
import type { Effect } from "./_internal/effect"

/**
 * Writes a new value to the `XRef.Synchronized`, with a guarantee of immediate
 * consistency (at some cost to performance).
 */
export function set_<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  value: A
): Effect<RA, EA, void> {
  return self.set(value)
}

/**
 * Writes a new value to the `XRef.Synchronized`, with a guarantee of immediate
 * consistency (at some cost to performance).
 *
 * @ets_data_first set_
 */
export function set<A>(value: A) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): Effect<RA, EA, void> => set_(self, value)
}
