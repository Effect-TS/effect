import { STMRetryException } from "@effect/core/stm/STM/definition/primitives"
import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Takes a value from the queue, retrying until a value is in the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue take
 * @category mutations
 * @since 1.0.0
 */
export function take<A>(self: TPriorityQueue<A>): USTM<A> {
  return STM.Effect((journal) => {
    concreteTPriorityQueue(self)
    const map = self.map.unsafeGet(journal)

    const result = pipe(
      map,
      SortedMap.headOption,
      Option.flatMap((entry) => {
        const a = pipe(
          Chunk.tail(entry[1]),
          Option.flatMap((chunk) => chunk.length > 0 ? Option.some(chunk) : Option.none)
        )
        const k = entry[0]

        self.map.unsafeSet(
          a._tag === "None" ?
            pipe(map, SortedMap.remove(k)) :
            pipe(map, SortedMap.set(k, a.value)),
          journal
        )

        return Chunk.head(entry[1])
      })
    )

    if (result._tag === "None") {
      throw new STMRetryException()
    }

    return result.value
  })
}
