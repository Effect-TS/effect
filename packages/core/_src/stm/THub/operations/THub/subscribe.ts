import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
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
