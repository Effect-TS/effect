import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Checks whether the queue is shut down.
 *
 * @tsplus getter ets/TQueue isShutdown
 */
export function isShutdown<A>(self: TQueue<A>): USTM<boolean> {
  concreteTQueue(self)
  return STM.Effect((journal) => {
    const queue = self.ref.unsafeGet(journal)

    return queue == null
  })
}
