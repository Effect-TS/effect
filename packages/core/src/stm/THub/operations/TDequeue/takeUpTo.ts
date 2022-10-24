import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"
import * as Chunk from "@fp-ts/data/Chunk"
/**
 * Takes up to the specified number of values from the queue.
 *
 * @tsplus static effect/core/stm/THub/TDequeue.Aspects takeUpTo
 * @tsplus pipeable effect/core/stm/THub/TDequeue takeUpTo
 * @category mutations
 * @since 1.0.0
 */
export function takeUpTo(max: number) {
  return <A>(self: THub.TDequeue<A>): STM<never, never, Chunk.Chunk<A>> => {
    concreteTDequeue(self)
    return STM.Effect((journal, fiberId) => {
      let currentSubscriberHead = self.subscriberHead.unsafeGet(journal)

      if (currentSubscriberHead == null) {
        throw new STMInterruptException(fiberId)
      }
      const builder: Array<A> = []
      let n = 0

      while (n != max) {
        const node = currentSubscriberHead.unsafeGet(journal)
        if (node == null) {
          n = max
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
              const updatedNode = THub.Node(node.head, subscribers - 1, node.tail)
              currentSubscriberHead.unsafeSet(updatedNode, journal)
            }
            builder.push(head)
            n += 1
          }
          currentSubscriberHead = tail
        }
      }
      self.subscriberHead.unsafeSet(currentSubscriberHead, journal)

      return Chunk.unsafeFromArray(builder)
    })
  }
}
