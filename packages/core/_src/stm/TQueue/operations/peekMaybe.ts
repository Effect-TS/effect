import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Views the next element in the queue without removing it, returning `None`
 * if the queue is empty.
 *
 * @tsplus getter effect/core/stm/TQueue peekMaybe
 */
export function peekMaybe<A>(self: TQueue<A>): USTM<Maybe<A>> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    return queue.head
  })
}
