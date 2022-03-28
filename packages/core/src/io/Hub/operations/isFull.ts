import type { UIO } from "../../Effect"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * Checks whether the hub is currently full.
 *
 * @tsplus fluent ets/XHub isFull
 */
export function isFull<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  __tsplusTrace?: string
): UIO<boolean> {
  concreteHub(self)
  return self._size.map((n) => n === self._capacity)
}
