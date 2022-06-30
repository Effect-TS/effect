import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
 * The current number of values in the hub.
 *
 * @tsplus getter effect/core/stm/THub size
 */
export function size<A>(self: THub<A>): USTM<number> {
  concreteTHub(self)
  return STM.Effect((journal, fiberId) => {
    const currentPublisherTail = self.publisherTail.unsafeGet(journal)

    if (currentPublisherTail == null) {
      throw new STMInterruptException(fiberId)
    }

    return self.hubSize.unsafeGet(journal)
  })
}
