import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 * Views the next element in the queue without removing it, returning `None`
 * if the queue is empty.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue peekMaybe
 */
export function peekMaybe<A>(self: THub.TDequeue<A>): STM<never, never, Maybe<A>> {
  concreteTDequeue(self)
  return STM.Effect((journal, fiberId) => {
    let currentSubscriberHead = self.subscriberHead.unsafeGet(journal)

    if (currentSubscriberHead == null) {
      throw new STMInterruptException(fiberId)
    }

    let a: Maybe<A> = Maybe.none
    let loop = true

    while (loop) {
      const node = currentSubscriberHead.unsafeGet(journal)

      if (node == null) {
        a = Maybe.none
        loop = false
      } else {
        const head = node.head
        const tail = node.tail

        if (head != null) {
          a = Maybe.some(node.head)
          loop = false
        } else {
          currentSubscriberHead = tail
        }
      }
    }

    return a
  })
}
