import type { Effect } from "../../Effect"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 *
 * @tsplus fluent ets/XHub publish
 */
export function publish_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  a: A
): Effect<RA, EA, boolean> {
  concreteHub(self)
  return self._publish(a)
}

/**
 * Publishes a message to the hub, returning whether the message was
 * published to the hub.
 */
export const publish = Pipeable(publish_)
