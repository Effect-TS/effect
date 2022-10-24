import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Takes all values from the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue takeAll
 * @category mutations
 * @since 1.0.0
 */
export function takeAll<A>(self: TPriorityQueue<A>): USTM<Chunk.Chunk<A>> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) => [
    pipe(
      map,
      SortedMap.reduce(
        Chunk.empty as Chunk.Chunk<A>,
        (acc, a) => pipe(acc, Chunk.concat(a))
      )
    ),
    map
  ])
}
