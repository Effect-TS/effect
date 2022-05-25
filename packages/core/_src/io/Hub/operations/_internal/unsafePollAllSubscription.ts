import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"

/**
 * Unsafely polls all values from a subscription.
 */
export function unsafePollAllSubscription<A>(subscription: Subscription<A>): Chunk<A> {
  return subscription.pollUpTo(Number.MAX_SAFE_INTEGER)
}
