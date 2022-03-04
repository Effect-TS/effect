import { Chunk } from "../../../collection/immutable/Chunk"
import * as Iter from "../../../collection/immutable/Iterable"
import * as SortedMap from "../../../collection/immutable/SortedMap"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Offers all of the elements in the specified collection to the queue.
 *
 * @tsplus fluent ets/TPriorityQueue offerAll
 */
export function offerAll_<A>(self: TPriorityQueue<A>, values: Iterable<A>): USTM<void> {
  concrete(self)
  return self.map
    .getAndUpdate((sa) =>
      Iter.reduce_(
        values,
        SortedMap.empty<A, Chunk<A>>(SortedMap.getOrd(sa)),
        (map, a) => SortedMap.set_(map, a, Chunk.single(a))
      )
    )
    .map(() => STM.unit)
}

/**
 * Offers all of the elements in the specified collection to the queue.
 *
 * @ets_data_first offerAll_
 */
export function offerAll<A>(a: Iterable<A>) {
  return (self: TPriorityQueue<A>): USTM<void> => self.offerAll(a)
}
