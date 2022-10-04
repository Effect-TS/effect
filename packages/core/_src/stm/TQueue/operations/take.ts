import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Takes a value from the queue.
 *
 * @tsplus getter effect/core/stm/TQueue take
 */
export function take<A>(self: TQueue<A>): USTM<A> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    const item = queue.dequeue

    if (item.isSome()) {
      const [a, queue] = item.value

      self.ref.unsafeSet(queue, journal)

      return a
    }

    throw new STMRetryException()
  })
}
