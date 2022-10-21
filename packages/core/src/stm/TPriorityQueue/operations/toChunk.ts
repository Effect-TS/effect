import { concreteTPriorityQueue } from "@effect/core/stm/TPriorityQueue/operations/_internal/InternalTPriorityQueue"

/**
 * Collects all values into a chunk.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue toChunk
 */
export function toChunk<A>(self: TPriorityQueue<A>): USTM<Chunk<A>> {
  concreteTPriorityQueue(self)
  return self.map.modify((sortedMap) => {
    const builder = Chunk.builder<Chunk<A>>()
    for (const [, as] of sortedMap) {
      builder.append(as)
    }
    return [builder.build().flatten, sortedMap]
  })
}
