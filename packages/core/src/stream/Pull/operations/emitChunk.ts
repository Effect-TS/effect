import type { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"

/**
 * @tsplus static ets/PullOps emitChunk
 */
export function emitChunk<A>(as: Chunk<A>, __tsplusTrace?: string): UIO<Chunk<A>> {
  return Effect.succeed(as)
}
