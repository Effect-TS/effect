import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Shuts down the hub.
 *
 * @tsplus getter effect/core/stm/THub shutdown
 * @category destructors
 * @since 1.0.0
 */
export function shutdown<A>(self: THub<A>): USTM<void> {
  concreteTHub(self)
  return STM.Effect((journal) => {
    const currentPublisherTail = self.publisherTail.unsafeGet(journal)
    if (currentPublisherTail == null) {
      self.publisherTail.unsafeSet(undefined, journal)

      const currentSubscribers = self.subscribers.unsafeGet(journal)!

      pipe(currentSubscribers, HashSet.forEach((tRef) => tRef.unsafeSet(undefined, journal)))

      self.subscribers.unsafeSet(HashSet.empty(), journal)
    }
  })
}
