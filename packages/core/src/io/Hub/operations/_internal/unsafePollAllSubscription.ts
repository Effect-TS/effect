import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Subscription } from "./Subscription"

/**
 * Unsafely polls all values from a subscription.
 */
export function unsafePollAllSubscription<A>(subscription: Subscription<A>): Chunk<A> {
  return subscription.pollUpTo(Number.MAX_SAFE_INTEGER)
}
