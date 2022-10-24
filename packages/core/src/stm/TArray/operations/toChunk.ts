import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Collects all elements into a chunk.
 *
 * @tsplus getter effect/core/stm/TArray toChunk
 * @category conversions
 * @since 1.0.0
 */
export function toChunk<A>(self: TArray<A>): USTM<Chunk<A>> {
  concreteTArray(self)
  return STM.forEach(self.chunk, (tref) => tref.get)
}
