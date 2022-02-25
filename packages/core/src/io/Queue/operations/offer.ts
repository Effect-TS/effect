import type { Effect } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Places one value in the queue.
 *
 * @tsplus fluent ets/Queue offer
 * @tsplus fluent ets/XQueue offer
 */
export function offer_<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  a: A,
  __tsplusTrace?: string
): Effect<RA, EA, boolean> {
  concreteQueue(self)
  return self._offer(a)
}

/**
 * Places one value in the queue.
 *
 * @ets_data_first offer_
 */
export function offer<A>(a: A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB, B>(
    self: XQueue<RA, RB, EA, EB, A, B>
  ): Effect<RA, EA, boolean> => self.offer(a)
}
