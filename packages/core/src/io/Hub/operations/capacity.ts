import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * The maximum capacity of the hub.
 *
 * @tsplus fluent ets/XHub capacity
 */
export function capacity<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): number {
  concreteHub(self)
  return self._capacity
}
