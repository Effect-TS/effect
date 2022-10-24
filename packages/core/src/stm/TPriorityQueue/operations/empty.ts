import { InternalTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import type { Order } from "@fp-ts/core/typeclass/Order"
import type { Chunk } from "@fp-ts/data/Chunk"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Constructs a new empty `TPriorityQueue` with the specified `Ordering`.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export function empty<A>(order: Order<A>): STM<never, never, TPriorityQueue<A>> {
  return TRef.make(SortedMap.empty<A, Chunk<A>>(order)).map(
    (map) => new InternalTPriorityQueue(map)
  )
}
