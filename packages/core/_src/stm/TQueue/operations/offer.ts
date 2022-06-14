import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Offers a value to the queue, returning whether the value was offered to the
 * queue.
 *
 * @tsplus fluent ets/TQueue offer
 */
export function offer_<A>(self: TQueue<A>, a: A): USTM<boolean> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    if (queue.size < self.capacity) {
      self.ref.unsafeSet(queue.append(a), journal)
      return true
    }
    switch (self.strategy) {
      case TQueue.BackPressure:
        throw new STMRetryException()
      case TQueue.Dropping:
        return false
      case TQueue.Sliding: {
        const dequeue = queue.dequeue

        if (dequeue.isSome()) {
          self.ref.unsafeSet(queue.append(a), journal)
        }
        return true
      }
    }

    return false
  })
}

/**
 * Offers a value to the queue, returning whether the value was offered to the
 * queue.
 *
 * @tsplus static ets/TQueue/Aspects offer
 */
export const offer = Pipeable(offer_)
