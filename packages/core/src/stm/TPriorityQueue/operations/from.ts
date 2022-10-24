import { InternalTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import type { Order } from "@fp-ts/core/typeclass/Order"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Makes a new `TPriorityQueue` initialized with provided `Collection`.
 *
 * @tsplus static effect/core/stm/TPriorityQueue.Ops from
 * @category constructors
 * @since 1.0.0
 */
export function from<A>(order: Order<A>) {
  return (data: Iterable<A>): STM<never, never, TPriorityQueue<A>> =>
    TRef.make(
      Array.from(data).reduce(
        (map, a) => pipe(map, SortedMap.set(a, Chunk.single(a))),
        SortedMap.empty<A, Chunk.Chunk<A>>(order)
      )
    ).map((map) => new InternalTPriorityQueue(map))
}
