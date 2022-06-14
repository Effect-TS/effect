import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * The current number of values in the queue.
 *
 * @tsplus getter ets/TQueue size
 */
export function size<A>(self: TQueue<A>): USTM<number> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    return queue.size
  })
}
