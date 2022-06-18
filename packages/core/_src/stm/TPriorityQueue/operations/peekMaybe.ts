import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Peeks at the first value in the queue without removing it, returning `None`
 * if there is not a value in the queue.
 *
 * @tsplus getter ets/TPriorityQueue peekMaybe
 */
export function peekMaybe<A>(self: TPriorityQueue<A>): USTM<Maybe<A>> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) =>
    Tuple(
      map.headMaybe.map((tuple) => tuple.get(1)).flatMap((chunk) => chunk.head),
      map
    )
  )
}
