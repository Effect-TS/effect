import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Subscription } from "./Subscription"

/**
 * Unsafely polls the specified number of values from a subscription.
 */
export function unsafePollN<A>(subscription: Subscription<A>, max: number): Chunk<A> {
  return subscription.pollUpTo(max)
}
