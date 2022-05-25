import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Peeks at the first value in the queue without removing it, returning `None`
 * if there is not a value in the queue.
 *
 * @tsplus fluent ets/TPriorityQueue peekOption
 */
export function peekOption<A>(self: TPriorityQueue<A>): USTM<Option<A>> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) =>
    Tuple(
      map.headOption().map((tuple) => tuple.get(1)).flatMap((chunk) => chunk.head),
      map
    )
  )
}
