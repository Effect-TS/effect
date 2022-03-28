import type { Effect } from "../../Effect"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 *
 * @tsplus fluent ets/XHub publishAll
 */
export function publishAll_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  as: Iterable<A>
): Effect<RA, EA, boolean> {
  concreteHub(self)
  return self._publishAll(as)
}

/**
 * Publishes all of the specified messages to the hub, returning whether
 * they were published to the hub.
 */
export const publishAll = Pipeable(publishAll_)
