import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Takes a value from the queue, returning `None` if there is not a value in
 * the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue takeOption
 * @category mutations
 * @since 1.0.0
 */
export function takeOption<A>(self: TPriorityQueue<A>): USTM<Option.Option<A>> {
  return STM.Effect((journal) => {
    concreteTPriorityQueue(self)
    const map = self.map.unsafeGet(journal)

    return pipe(
      map,
      SortedMap.headOption,
      Option.flatMap((entry) => {
        const a = pipe(
          entry[1],
          Chunk.tail,
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
  })
}
