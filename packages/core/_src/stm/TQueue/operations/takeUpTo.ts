import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"

/**
 * Takes up to the specified number of values from the queue.
 *
 * @tsplus static effect/core/stm/TQueue.Aspects takeUpTo
 * @tsplus pipeable effect/core/stm/TQueue takeUpTo
 */
export function takeUpTo(max: number) {
  return <A>(self: TQueue<A>): STM<never, never, Chunk<A>> => {
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
}
