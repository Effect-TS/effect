import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"
import * as Queue from "@fp-ts/data/Queue"

/**
 * The current number of values in the queue.
 *
 * @tsplus getter effect/core/stm/TQueue size
 * @category getters
 * @since 1.0.0
 */
export function size<A>(self: TQueue<A>): USTM<number> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    return Queue.length(queue)
  })
}
