import { concreteTArray } from "@effect/core/stm/TArray/operations/_internal/InternalTArray";

/**
 * Collects all elements into a chunk.
 *
 * @tsplus fluent ets/TArray toChunk
 */
export function toChunk<A>(self: TArray<A>): USTM<Chunk<A>> {
  concreteTArray(self);
  return STM.forEach(self.chunk, (tref) => tref.get());
}
