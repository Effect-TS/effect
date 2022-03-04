import type { Chunk } from "../../../collection/immutable/Chunk"
import type { USTM } from "../../STM"
import { STM } from "../../STM"
import type { TArray } from "../definition"
import { concrete } from "./_internal/InternalTArray"

/**
 * Collects all elements into a chunk.
 *
 * @tsplus fluent ets/TArray toChunk
 */
export function toChunk<A>(self: TArray<A>): USTM<Chunk<A>> {
  concrete(self)
  return STM.forEach(self.chunk, (tref) => tref.get())
}
