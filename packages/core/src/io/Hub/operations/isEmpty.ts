import type { UIO } from "../../Effect"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * Checks whether the hub is currently empty.
 *
 * @tsplus fluent ets/XHub isEmpty
 */
export function isEmpty<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  __tsplusTrace?: string
): UIO<boolean> {
  concreteHub(self)
  return self._size.map((n) => n === 0)
}
