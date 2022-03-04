import { Chunk } from "../../../collection/immutable/Chunk"
import * as SortedMap from "../../../collection/immutable/SortedMap"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Offers the specified value to the queue.
 *
 * @tsplus fluent ets/TPriorityQueue offer
 */
export function offer_<A>(self: TPriorityQueue<A>, a: A): USTM<void> {
  concrete(self)
  return self.map.getAndUpdate(SortedMap.set(a, Chunk.single(a))).map(() => STM.unit)
}

/**
 * Offers the specified value to the queue.
 *
 * @ets_data_first offer_
 */
export function offer<A>(a: A) {
  return (self: TPriorityQueue<A>): USTM<void> => self.offer(a)
}
