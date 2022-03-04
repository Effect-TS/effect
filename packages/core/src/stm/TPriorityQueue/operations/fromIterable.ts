import { Chunk } from "../../../collection/immutable/Chunk"
import * as Iter from "../../../collection/immutable/Iterable"
import * as SortedMap from "../../../collection/immutable/SortedMap"
import type { Ord } from "../../../prelude/Ord"
import type { USTM } from "../../STM"
import { TRef } from "../../TRef"
import type { TPriorityQueue } from "../definition"
import { InternalTPriorityQueue } from "./_internal/InternalTPriorityQueue"

/**
 * Makes a new `TPriorityQueue` initialized with provided iterable.
 *
 * @tsplus static ets/TPriorityQueueOps fromIterable
 */
export function fromIterable<A>(ord: Ord<A>) {
  return (data: Iterable<A>): USTM<TPriorityQueue<A>> =>
    TRef.make(
      Iter.reduce_(data, SortedMap.empty<A, Chunk<A>>(ord), (map, a) =>
        SortedMap.set_(map, a, Chunk.single(a))
      )
    ).map((map) => new InternalTPriorityQueue(map))
}
