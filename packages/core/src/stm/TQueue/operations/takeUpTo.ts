import { STMInterruptException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Queue from "@fp-ts/data/Queue"

/**
 * Takes up to the specified number of values from the queue.
 *
 * @tsplus static effect/core/stm/TQueue.Aspects takeUpTo
 * @tsplus pipeable effect/core/stm/TQueue takeUpTo
 * @category mutations
 * @since 1.0.0
 */
export function takeUpTo(max: number) {
  return <A>(self: TQueue<A>): STM<never, never, Chunk.Chunk<A>> => {
    concreteTQueue(self)
    return STM.Effect((journal, fiberId) => {
      const queue = self.ref.unsafeGet(journal)

      if (queue == null) {
        throw new STMInterruptException(fiberId)
      }

      const [toTake, remaining] = pipe(queue, Chunk.fromIterable, Chunk.splitAt(max))
      self.ref.unsafeSet(Queue.fromIterable(remaining), journal)

      return Chunk.fromIterable(toTake)
    })
  }
}
