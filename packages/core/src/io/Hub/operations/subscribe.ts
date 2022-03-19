import type { Managed } from "../../Managed"
import type { XDequeue } from "../../Queue"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * Subscribes to receive messages from the hub. The resulting subscription
 * can be evaluated multiple times within the scope of the managed to take a
 * message from the hub each time.
 *
 * @tsplus fluent ets/XHub subscribe
 */
export function subscribe<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): Managed<unknown, never, XDequeue<RB, EB, B>> {
  concreteHub(self)
  return self._subscribe
}
