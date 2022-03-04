import type { Chunk } from "../../../collection/immutable/Chunk"
import * as SortedMap from "../../../collection/immutable/SortedMap"
import type { Ord } from "../../../prelude/Ord"
import type { USTM } from "../../STM"
import { TRef } from "../../TRef"
import type { TPriorityQueue } from "../definition"
import { InternalTPriorityQueue } from "./_internal/InternalTPriorityQueue"

/**
 * Constructs a new empty `TPriorityQueue` with the specified `Ordering`.
 *
 * @tsplus static ets/TPriorityQueueOps empty
 */
export function empty<A>(ord: Ord<A>): USTM<TPriorityQueue<A>> {
  return TRef.make(SortedMap.empty<A, Chunk<A>>(ord)).map(
    (map) => new InternalTPriorityQueue(map)
  )
}
