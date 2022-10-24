import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"
import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export interface AtomicHub<A> {
  readonly capacity: number
  get isEmpty(): boolean
  get isFull(): boolean
  publish(a: A): boolean
  publishAll(as: Iterable<A>): Chunk<A>
  get size(): number
  slide(): void
  subscribe(): Subscription<A>
}
