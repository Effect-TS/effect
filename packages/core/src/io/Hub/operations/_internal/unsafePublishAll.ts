import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { AtomicHub } from "./AtomicHub"

/**
 * Unsafely publishes the specified values to a hub.
 */
export function unsafePublishAll<A>(hub: AtomicHub<A>, as: Iterable<A>): Chunk<A> {
  return hub.publishAll(as)
}
