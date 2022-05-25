import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"

/**
 * Unsafely polls the specified number of values from a subscription.
 */
export function unsafePollN<A>(subscription: Subscription<A>, max: number): Chunk<A> {
  return subscription.pollUpTo(max)
}
