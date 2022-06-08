import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Takes up to the specified number of values from the queue.
 *
 * @tsplus fluent ets/TQueue takeUpTo
 */
export function takeUpTo_<A>(self: TQueue<A>, max: number): USTM<Chunk<A>> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    const { tuple: [toTake, remaining] } = queue.splitAt(max)
    self.ref.unsafeSet(remaining, journal)

    return Chunk.from(toTake)
  })
}

/**
 * Takes up to the specified number of values from the queue.
 *
 * @tsplus static ets/TQueue/Aspects takeUpTo
 */
export const takeUpTo = Pipeable(takeUpTo_)
