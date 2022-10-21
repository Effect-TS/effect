import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Offers a value to the queue, returning whether the value was offered to the
 * queue.
 *
 * @tsplus static effect/core/stm/TQueue.Aspects offer
 * @tsplus pipeable effect/core/stm/TQueue offer
 */
export function offer<A>(value: A) {
  return (self: TQueue<A>): STM<never, never, boolean> => {
    concreteTQueue(self)
    return STM.Effect((journal, fiberId) => {
      const queue = self.ref.unsafeGet(journal)

      if (queue == null) {
        throw new STMInterruptException(fiberId)
      }

      if (queue.size < self.capacity) {
        self.ref.unsafeSet(queue.append(value), journal)
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
            self.ref.unsafeSet(queue.append(value), journal)
          }
          return true
        }
      }

      return false
    })
  }
}
