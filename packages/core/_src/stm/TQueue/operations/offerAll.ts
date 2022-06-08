import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Offers all of the specified values to the queue, returning whether they
 * were offered to the queue.
 *
 * @tsplus fluent ets/TQueue offerAll
 */
export function offerAll_<A>(self: TQueue<A>, as0: Collection<A>): USTM<boolean> {
  concreteTQueue(self)
  const as = as0.asList()
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    if (queue.size + as.length <= self.capacity) {
      self.ref.unsafeSet(queue.appendAll(as), journal)
      return true
    }

    switch (self.strategy) {
      case TQueue.BackPressure:
        throw new STMRetryException()
      case TQueue.Dropping: {
        const forQueue = as.take(self.capacity - queue.size)
        self.ref.unsafeSet(queue.appendAll(forQueue), journal)
        return false
      }
      case TQueue.Sliding: {
        const forQueue = as.take(self.capacity).asList()
        const toDrop = queue.size + forQueue.length - self.capacity
        self.ref.unsafeSet(queue.drop(toDrop).appendAll(forQueue), journal)
        return true
      }
    }

    return false
  })
}

/**
 * Offers all of the specified values to the queue, returning whether they
 * were offered to the queue.
 *
 * @tsplus static ets/TQueue/Aspects offerAll
 */
export const offerAll = Pipeable(offerAll_)
