import { STMRetryException } from "@effect/core/stm/STM/definition/primitives"
import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Peeks at the first value in the queue without removing it, retrying until a
 * value is in the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue peek
 * @category getters
 * @since 1.0.0
 */
export function peek<A>(self: TPriorityQueue<A>): USTM<A> {
  return STM.Effect((journal) => {
    concreteTPriorityQueue(self)

    const result = pipe(
      SortedMap.headOption(self.map.unsafeGet(journal)),
      Option.map((entry) => entry[1]),
      Option.flatMap(Chunk.head)
    )

    if (result._tag === "None") {
      throw new STMRetryException()
    }

    return result.value
  })
}
