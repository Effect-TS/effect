import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export function unsafePollN<A>(subscription: Subscription<A>, max: number): Chunk<A> {
  return subscription.pollUpTo(max)
}
