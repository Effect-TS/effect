import type { Array } from "../../../collection/immutable/Array"
import type { Chunk } from "../../../collection/immutable/Chunk"
import * as SortedMap from "../../../collection/immutable/SortedMap"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Collects all values into an array.
 *
 * @tsplus fluent ets/TPriorityQueue toArray
 */
export function toArray<A>(self: TPriorityQueue<A>): USTM<Array<A>> {
  concrete(self)
  return self.map.modify((map) => {
    const entries = SortedMap.entries(map)
    const result: A[] = []
    let e: SortedMap.Next<readonly [A, Chunk<A>]>

    while (!(e = entries.next()).done) {
      const [, as] = e.value
      result.push(...(as.toArray() as A[]))
    }

    return Tuple(result, map)
  })
}
