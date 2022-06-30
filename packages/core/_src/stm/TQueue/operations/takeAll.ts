import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * takeAlls all the values from the queue.
 *
 * @tsplus getter effect/core/stm/TQueue takeAll
 */
export function takeAll<A>(self: TQueue<A>): USTM<Chunk<A>> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    self.ref.unsafeSet(ImmutableQueue.empty<A>(), journal)

    return Chunk.from(queue)
  })
}
