import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
 * Subscribes to receive messages from the hub. The resulting subscription can
 * be evaluated multiple times to take a message from the hub each time. The
 * caller is responsible for unsubscribing from the hub by shutting down the
 * queue.
 *
 * @tsplus getter effect/core/stm/THub subscribe
 */
export function subscribe<A>(self: THub<A>): USTM<THub.TDequeue<A>> {
  concreteTHub(self)
  return THub.TDequeue(
    self.hubSize,
    self.publisherHead,
    self.publisherTail,
    self.requestedCapacity,
    self.subscriberCount,
    self.subscribers
  )
}
