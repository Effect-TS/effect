import { Chunk } from "../../../collection/immutable/Chunk"
import * as SortedMap from "../../../collection/immutable/SortedMap"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Takes all values from the queue.
 *
 * @tsplus fluent ets/TPriorityQueue takeAll
 */
export function takeAll<A>(self: TPriorityQueue<A>): USTM<Chunk<A>> {
  concrete(self)
  return self.map.modify((map) =>
    Tuple(
      SortedMap.reduce_(map, Chunk.empty<A>(), (acc, a) => acc + a),
      map
    )
  )
}
