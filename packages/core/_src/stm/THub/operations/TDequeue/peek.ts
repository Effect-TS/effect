import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 * Views the next element in the queue without removing it, retrying if the
 * queue is empty.
 *
 * @tsplus getter ets/THub/TDequeue peek
 */
export function peek<A>(self: THub.TDequeue<A>): USTM<A> {
  concreteTDequeue(self)
  return STM.Effect((journal, fiberId) => {
    let currentSubscriberHead = self.subscriberHead.unsafeGet(journal)

    if (currentSubscriberHead == null) {
      throw new STMInterruptException(fiberId)
    }

    let a = undefined as A
    let loop = true

    while (loop) {
      const node = currentSubscriberHead.unsafeGet(journal)

      if (node == null) {
        throw new STMRetryException()
      }

      const head = node.head
      const tail = node.tail

      if (head != null) {
        a = node.head
        loop = false
      } else {
        currentSubscriberHead = tail
      }
    }

    return a
  })
}
