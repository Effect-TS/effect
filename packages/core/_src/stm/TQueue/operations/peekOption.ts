import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Views the next element in the queue without removing it, returning `None`
 * if the queue is empty.
 *
 * @tsplus getter ets/TQueue peekOption
 */
export function peekOption<A>(self: TQueue<A>): USTM<Option<A>> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    return queue.head()
  })
}
