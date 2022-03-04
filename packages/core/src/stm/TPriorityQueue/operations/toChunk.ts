import { Chunk } from "../../../collection/immutable/Chunk"
import * as SortedMap from "../../../collection/immutable/SortedMap"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Collects all values into a chunk.
 *
 * @tsplus fluent ets/TPriorityQueue toChunk
 */
export function toChunk<A>(self: TPriorityQueue<A>): USTM<Chunk<A>> {
  concrete(self)
  return self.map.modify((map) => {
    const entries = SortedMap.entries(map)
    const builder = Chunk.builder<Chunk<A>>()
    let e: SortedMap.Next<readonly [A, Chunk<A>]>

    while (!(e = entries.next()).done) {
      const [, as] = e.value
      builder.append(as)
    }

    return Tuple(builder.build().flatten(), map)
  })
}
