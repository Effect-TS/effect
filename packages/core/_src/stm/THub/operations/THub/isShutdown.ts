import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
 * Checks whether the hub is shut down.
 *
 * @tsplus getter effect/core/stm/THub isShutdown
 */
export function isShutdown<A>(self: THub<A>): USTM<boolean> {
  concreteTHub(self)
  return STM.Effect((journal) => {
    const currentPublisherTail = self.publisherTail.unsafeGet(journal)

    return currentPublisherTail == null
  })
}
