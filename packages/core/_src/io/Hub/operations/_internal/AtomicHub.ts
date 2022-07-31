import type { Subscription } from "@effect/core/io/Hub/operations/_internal/Subscription"

export interface AtomicHub<A> {
  readonly capacity: number
  get isEmpty(): boolean
  get isFull(): boolean
  publish(a: A): boolean
  publishAll(as: Collection<A>): Chunk<A>
  get size(): number
  slide(): void
  subscribe(): Subscription<A>
}
