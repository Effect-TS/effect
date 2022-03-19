import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Subscription } from "./Subscription"

export interface AtomicHub<A> {
  readonly capacity: number
  isEmpty(): boolean
  isFull(): boolean
  publish(a: A): boolean
  publishAll(as: Iterable<A>): Chunk<A>
  size(): number
  slide(): void
  subscribe(): Subscription<A>
}
