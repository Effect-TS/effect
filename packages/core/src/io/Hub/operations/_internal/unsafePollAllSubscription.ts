import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export function unsafePollAllSubscription<A>(subscription: Subscription<A>): Chunk<A> {
  return subscription.pollUpTo(Infinity)
}
