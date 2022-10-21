import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Views the next element in the queue without removing it, retrying if the
 * queue is empty.
 *
 * @tsplus getter effect/core/stm/TQueue peek
 */
export function peek<A>(self: TQueue<A>): USTM<A> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    const first = queue.head

    if (first.isSome()) {
      return first.value
    }

    throw new STMRetryException()
  })
}
