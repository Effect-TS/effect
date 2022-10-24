import { STMInterruptException, STMRetryException } from "@effect/core/stm/STM"
import { concreteTQueue } from "@effect/core/stm/TQueue/operations/_internal/InternalTQueue"
import * as Option from "@fp-ts/data/Option"
import * as Queue from "@fp-ts/data/Queue"

/**
 * Views the next element in the queue without removing it, retrying if the
 * queue is empty.
 *
 * @tsplus getter effect/core/stm/TQueue peek
 * @category getters
 * @since 1.0.0
 */
export function peek<A>(self: TQueue<A>): USTM<A> {
  concreteTQueue(self)
  return STM.Effect((journal, fiberId) => {
    const queue = self.ref.unsafeGet(journal)

    if (queue == null) {
      throw new STMInterruptException(fiberId)
    }

    const first = Queue.head(queue)

    if (Option.isSome(first)) {
      return first.value
    }

    throw new STMRetryException()
  })
}
