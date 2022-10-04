import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Collects all values into an array.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue toImmutableArray
 */
export function toArray<A>(self: TPriorityQueue<A>): USTM<ImmutableArray<A>> {
  concreteTPriorityQueue(self)
  return self.map.modify((map) => {
    const entries = map.entries
    const result: A[] = []
    let e: IteratorResult<readonly [A, Chunk<A>]>
    while (!(e = entries.next()).done) {
      const [, as] = e.value
      result.push(...Array.from(as))
    }
    return [ImmutableArray.from(result), map] as const
  })
}
