import { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"

/**
 * @tsplus static ets/PullOps emit
 */
export function emit<A>(a: A, __tsplusTrace?: string): UIO<Chunk<A>> {
  return Effect.succeed(Chunk.single(a))
}
