import { Chunk } from "../../../collection/immutable/Chunk"
import * as SortedMap from "../../../collection/immutable/SortedMap"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { USTM } from "../../STM"
import type { TPriorityQueue } from "../definition"
import { concrete } from "./_internal/InternalTPriorityQueue"

/**
 * Takes up to the specified maximum number of elements from the queue.
 *
 * @tsplus fluent ets/TPriorityQueue takeUpTo
 */
export function takeUpTo_<A>(self: TPriorityQueue<A>, n: number): USTM<Chunk<A>> {
  concrete(self)
  return self.map.modify((map) => {
    const entries = SortedMap.entries(map)
    const builder = Chunk.builder<Chunk<A>>()
    let updated = map
    let e: SortedMap.Next<readonly [A, Chunk<A>]>
    let i = 0

    while (!(e = entries.next()).done) {
      const [a, as] = e.value
      const {
        tuple: [l, r]
      } = as.splitAt(n - i)

      builder.append(l)

      if (r.isEmpty()) {
        updated = SortedMap.remove_(updated, a)
      } else {
        updated = SortedMap.set_(updated, a, r)
      }

      i += l.size
    }

    return Tuple(builder.build().flatten(), updated)
  })
}

/**
 * Takes up to the specified maximum number of elements from the queue.
 *
 * @ets_data_first takeUpTo_
 */
export function takeUpTo(n: number) {
  return <A>(self: TPriorityQueue<A>): USTM<Chunk<A>> => self.takeUpTo(n)
}
