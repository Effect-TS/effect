import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
 * Shuts down the hub.
 *
 * @tsplus getter ets/THub shutdown
 */
export function shutdown<A>(self: THub<A>): USTM<void> {
  concreteTHub(self)
  return STM.Effect((journal) => {
    const currentPublisherTail = self.publisherTail.unsafeGet(journal)
    if (currentPublisherTail == null) {
      self.publisherTail.unsafeSet(undefined, journal)

      const currentSubscribers = self.subscribers.unsafeGet(journal)!

      currentSubscribers.forEach((_) => _.unsafeSet(undefined, journal))

      self.subscribers.unsafeSet(HashSet.empty(), journal)
    }
  })
}
