import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 * The current number of values in the queue.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue size
 * @category getters
 * @since 1.0.0
 */
export function size<A>(self: THub.TDequeue<A>): STM<never, never, number> {
  concreteTDequeue(self)
  return STM.Effect((journal, fiberId) => {
    let currentSubscriberHead = self.subscriberHead.unsafeGet(journal)

    if (currentSubscriberHead == null) {
      throw new STMInterruptException(fiberId)
    }

    let loop = true
    let size = 0
    while (loop) {
      const node = currentSubscriberHead.unsafeGet(journal)
      if (node == null) {
        loop = false
      } else {
        const head = node.head
        const tail = node.tail

        if (head != null) {
          size += 1
          if (size >= Number.MAX_SAFE_INTEGER) {
            loop = false
          }
        }

        currentSubscriberHead = tail
      }
    }
    return size
  })
}
