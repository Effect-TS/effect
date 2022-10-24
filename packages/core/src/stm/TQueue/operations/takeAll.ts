import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Queue from "@fp-ts/data/Queue"

/**
 * Takes all the values from the queue.
 *
 * @tsplus getter effect/core/stm/TQueue takeAll
 * @category mutations
 * @since 1.0.0
 */
export function takeAll<A>(self: TQueue<A>): USTM<Chunk.Chunk<A>> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    self.ref.unsafeSet(Queue.empty<A>(), journal)

    return Chunk.fromIterable(queue)
  })
}
