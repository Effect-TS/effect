import { Chunk } from "../../../collection/immutable/Chunk"
import type { IO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"

/**
 * @tsplus static ets/PullOps empty
 */
export function empty<A>(): IO<never, Chunk<A>> {
  return Effect.succeed(Chunk.empty<A>())
}
