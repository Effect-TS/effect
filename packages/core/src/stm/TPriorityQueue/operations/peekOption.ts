import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Peeks at the first value in the queue without removing it, returning `None`
 * if there is not a value in the queue.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue peekOption
 * @category getters
 * @since 1.0.0
 */
export function peekOption<A>(self: TPriorityQueue<A>): USTM<Option.Option<A>> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) => [
    pipe(
      map,
      SortedMap.headOption,
      Option.map((tuple) => tuple[1]),
      Option.flatMap(Chunk.head)
    ),
    map
  ])
}
