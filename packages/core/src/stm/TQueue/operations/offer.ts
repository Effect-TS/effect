import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as Queue from "@fp-ts/data/Queue"

/**
 * Offers a value to the queue, returning whether the value was offered to the
 * queue.
 *
 * @tsplus static effect/core/stm/TQueue.Aspects offer
 * @tsplus pipeable effect/core/stm/TQueue offer
 * @category mutations
 * @since 1.0.0
 */
export function offer<A>(value: A) {
  return (self: TQueue<A>): STM<never, never, boolean> => {
    concreteTQueue(self)
    return STM.Effect((journal, fiberId) => {
      const queue = self.ref.unsafeGet(journal)

      if (queue == null) {
        throw new STMInterruptException(fiberId)
      }

      if (Queue.length(queue) < self.capacity) {
        self.ref.unsafeSet(pipe(queue, Queue.enqueue(value)), journal)
        return true
      }
      switch (self.strategy) {
        case TQueue.BackPressure:
          throw new STMRetryException()
        case TQueue.Dropping:
          return false
        case TQueue.Sliding: {
          const dequeue = pipe(queue, Queue.dequeue)

          if (Option.isSome(dequeue)) {
            self.ref.unsafeSet(pipe(queue, Queue.enqueue(value)), journal)
          }
          return true
        }
      }

      return false
    })
  }
}
