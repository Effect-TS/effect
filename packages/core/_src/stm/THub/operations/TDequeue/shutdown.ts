import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 * Views the next element in the queue without removing it, retrying if the
 * queue is empty.
 *
 * @tsplus getter ets/THub/TDequeue shutdown
 */
export function shutdown<A>(self: THub.TDequeue<A>): USTM<void> {
  concreteTDequeue(self)
  return STM.Effect((journal) => {
    let currentSubscriberHead = self.subscriberHead.unsafeGet(journal)

    if (currentSubscriberHead != null) {
      self.subscriberHead.unsafeSet(undefined, journal)
      let loop = true

      while (loop) {
        const node = currentSubscriberHead.unsafeGet(journal)
        if (node == null) {
          loop = false
        } else {
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
              const updatedNode = THub.Node(undefined, subscribers - 1, node.tail)
              currentSubscriberHead.unsafeSet(updatedNode, journal)
            }
          }
          currentSubscriberHead = tail
        }
      }
      const currentSubscriberCount = self.subscriberCount.unsafeGet(journal)
      self.subscriberCount.unsafeSet(currentSubscriberCount - 1, journal)

      self.subscribers.unsafeSet(self.subscribers.unsafeGet(journal) - self.subscriberHead, journal)
    }
  })
}
