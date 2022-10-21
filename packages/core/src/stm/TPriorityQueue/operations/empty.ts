import { InternalTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Constructs a new empty `TPriorityQueue` with the specified `Ordering`.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Ops empty
 */
export function empty<A>(ord: Ord<A>): STM<never, never, TPriorityQueue<A>> {
  return TRef.make(SortedMap.empty<A, Chunk<A>>(ord)).map(
    (map) => new InternalTPriorityQueue(map)
  )
}
