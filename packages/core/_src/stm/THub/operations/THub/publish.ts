import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import type { Node } from "@effect/core/stm/THub/definition/Node"
import { concreteTHub } from "@effect/core/stm/THub/operations/_internal/InternalTHub"

/**
 * Publishes a value to the hub, returning whether the value was published to the
 * queue.
 *
 * @tsplus static effect/core/stm/THub.Aspects publish
 * @tsplus pipeable effect/core/stm/THub publish
 */
export function publish<A>(value: A) {
  return (self: THub<A>): STM<never, never, boolean> => {
    concreteTHub(self)
    return STM.Effect((journal, fiberId) => {
      const currentPublisherTail = self.publisherTail.unsafeGet(journal)

      if (currentPublisherTail == null) {
        throw new STMInterruptException(fiberId)
      }

      const currentSubscriberCount = self.subscriberCount.unsafeGet(journal)

      if (currentSubscriberCount === 0) {
        return true
      }

      const currentHubSize = self.hubSize.unsafeGet(journal)
      if (currentHubSize < self.capacity) {
        const updatedPublisherTail = TRef.unsafeMake<Node<A>>(undefined!)
        const updatedNode = THub.Node(value, currentSubscriberCount, updatedPublisherTail)

        currentPublisherTail.unsafeSet(updatedNode, journal)

        self.publisherTail.unsafeSet(updatedPublisherTail, journal)
        self.hubSize.unsafeSet(currentHubSize + 1, journal)

        return true
      }

      switch (self.strategy) {
        case THub.BackPressure:
          throw new STMRetryException()
        case THub.Dropping:
          return false
        case THub.Sliding: {
          if (self.capacity > 0) {
            let currentPublisherHead = self.publisherHead.unsafeGet(journal)
            let loop = true
            while (loop) {
              const node = currentPublisherHead.unsafeGet(journal)
              if (node == null) {
                throw new STMRetryException()
              } else {
                const head = node.head
                const tail = node.tail
                if (head != null) {
                  const updatedNode = THub.Node(undefined as A, node.subscribers, node.tail)

                  currentPublisherHead.unsafeSet(updatedNode, journal)
                  self.publisherHead.unsafeSet(tail, journal)
                  loop = false
                } else {
                  currentPublisherHead = tail
                }
              }
            }
            const updatedPublisherTail = TRef.unsafeMake<Node<A>>(undefined!)
            const updatedNode = THub.Node(value, currentSubscriberCount, updatedPublisherTail)

            currentPublisherTail.unsafeSet(updatedNode, journal)
            self.publisherTail.unsafeSet(updatedPublisherTail, journal)
          }
          return true
        }
      }

      return false
    })
  }
}
