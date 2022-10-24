import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"
import * as Option from "@fp-ts/data/Option"
import * as Queue from "@fp-ts/data/Queue"

/**
 * Takes a value from the queue.
 *
 * @tsplus getter effect/core/stm/TQueue take
 * @category mutations
 * @since 1.0.0
 */
export function take<A>(self: TQueue<A>): USTM<A> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    const item = Queue.dequeue(queue)

    if (Option.isSome(item)) {
      const [a, queue] = item.value

      self.ref.unsafeSet(queue, journal)

      return a
    }

    throw new STMRetryException()
  })
}
