import { concreteTDequeue } from "@effect/core/stm/THub/operations/_internal/InternalTDequeue"

/**
 * Checks whether the queue is shut down.
 *
 * @tsplus getter ets/THub/TDequeue isShutdown
 */
export function isShutdown<A>(self: THub.TDequeue<A>): USTM<boolean> {
  concreteTDequeue(self)
  return STM.Effect((journal) => {
    const currentSubscriberHead = self.subscriberHead.unsafeGet(journal)

    return currentSubscriberHead == null
  })
}
