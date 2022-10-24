import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Collects all values into a chunk.
 *
 * @tsplus getter effect/core/stm/TPriorityQueue toChunk
 * @category conversions
 * @since 1.0.0
 */
export function toChunk<A>(self: TPriorityQueue<A>): USTM<Chunk.Chunk<A>> {
  return self.toReadonlyArray.map(Chunk.fromIterable)
}
