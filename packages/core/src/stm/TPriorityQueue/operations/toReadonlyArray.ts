import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"
import type { Chunk } from "@fp-ts/data/Chunk"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * Collects all values into an array.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue toReadonlyArray
 * @category conversions
 * @since 1.0.0
 */
export function toReadonlyArray<A>(self: TPriorityQueue<A>): USTM<ReadonlyArray<A>> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) => {
    const entries = SortedMap.entries(map)
    const result: A[] = []
    let e: IteratorResult<readonly [A, Chunk<A>]>
    while (!(e = entries.next()).done) {
      const [, as] = e.value
      result.push(...Array.from(as))
    }
    return [result, map] as const
  })
}
