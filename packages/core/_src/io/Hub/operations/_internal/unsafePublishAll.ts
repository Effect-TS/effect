import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub";

/**
 * Unsafely publishes the specified values to a hub.
 */
export function unsafePublishAll<A>(hub: AtomicHub<A>, as: Collection<A>): Chunk<A> {
  return hub.publishAll(as);
}
