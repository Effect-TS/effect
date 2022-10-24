import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"
import { pipe } from "@fp-ts/data/Function"
import * as Queue from "@fp-ts/data/Queue"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

/**
 * Offers all of the specified values to the queue, returning whether they
 * were offered to the queue.
 *
 * @tsplus static effect/core/stm/TQueue.Aspects offerAll
 * @tsplus pipeable effect/core/stm/TQueue offerAll
 * @category mutations
 * @since 1.0.0
 */
export function offerAll<A>(as: Iterable<A>) {
  return (self: TQueue<A>): STM<never, never, boolean> => {
    concreteTQueue(self)
    const as0 = Array.from(as)
    return STM.Effect((journal, fiberId) => {
      const queue = self.ref.unsafeGet(journal)

      if (queue == null) {
        throw new STMInterruptException(fiberId)
      }

      if (Queue.length(queue) + as0.length <= self.capacity) {
        self.ref.unsafeSet(pipe(queue, Queue.enqueueAll(as)), journal)
        return true
      }

      switch (self.strategy) {
        case TQueue.BackPressure:
          throw new STMRetryException()
        case TQueue.Dropping: {
          const forQueue = pipe(as0, ReadonlyArray.takeLeft(self.capacity - Queue.length(queue)))
          self.ref.unsafeSet(pipe(queue, Queue.enqueueAll(forQueue)), journal)
          return false
        }
        case TQueue.Sliding: {
          const forQueue = pipe(as0, ReadonlyArray.takeLeft(self.capacity))
          const toDrop = Queue.length(queue) + forQueue.length - self.capacity
          self.ref.unsafeSet(
            pipe(
              ReadonlyArray.fromIterable(queue),
              ReadonlyArray.dropLeft(toDrop),
              Queue.fromIterable,
              Queue.enqueueAll(forQueue)
            ),
            journal
          )
          return true
        }
      }

      return false
    })
  }
}
