import type { Managed } from "../../Managed/definition"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Returns a managed effect that sets the value associated with the curent
 * fiber to the specified value as its `acquire` action and restores it to its
 * original value as its `release` action.
 */
export function locallyManaged_<E, A>(
  self: XFiberRef<E, E, A, A>,
  value: A,
  __etsTrace?: string
): Managed<unknown, E, void> {
  concreteUnified(self)
  return self.locallyManaged(value)
}

/**
 * Returns a managed effect that sets the value associated with the curent
 * fiber to the specified value as its `acquire` action and restores it to its
 * original value as its `release` action.
 *
 * @ets_data_first locallyManaged_
 */
export function locallyManaged<A>(value: A, __etsTrace?: string) {
  return <E>(self: XFiberRef<E, E, A, A>): Managed<unknown, E, void> =>
    locallyManaged_(self, value)
}
