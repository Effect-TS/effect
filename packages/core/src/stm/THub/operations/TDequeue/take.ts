import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 * Takes a value from the queue.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue take
 * @category mutations
 * @since 1.0.0
 */
export function take<A>(self: THub.TDequeue<A>): USTM<A> {
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
        const subscribers = node.subscribers
        if (subscribers == 1) {
          const size = self.hubSize.unsafeGet(journal)
          const updatedNode = THub.Node(undefined, 0, node.tail)

          currentSubscriberHead.unsafeSet(updatedNode, journal)
          self.publisherHead.unsafeSet(tail, journal)
          self.hubSize.unsafeSet(size - 1, journal)
        } else {
          const updatedNode = THub.Node(node.head, subscribers - 1, node.tail)
          currentSubscriberHead.unsafeSet(updatedNode, journal)
        }

        self.subscriberHead.unsafeSet(tail, journal)
        a = head
        loop = false
      } else {
        currentSubscriberHead = tail
      }
    }

    return a
  })
}
