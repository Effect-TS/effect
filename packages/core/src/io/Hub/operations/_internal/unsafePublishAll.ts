import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub"
import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export function unsafePublishAll<A>(hub: AtomicHub<A>, as: Iterable<A>): Chunk<A> {
  return hub.publishAll(as)
}
