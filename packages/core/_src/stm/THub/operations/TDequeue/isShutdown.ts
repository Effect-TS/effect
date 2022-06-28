import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 * Checks whether the queue is shut down.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue isShutdown
 */
export function isShutdown<A>(self: THub.TDequeue<A>): STM<never, never, boolean> {
  concreteTDequeue(self)
  return STM.Effect((journal) => {
    const currentSubscriberHead = self.subscriberHead.unsafeGet(journal)

    return currentSubscriberHead == null
  })
}
