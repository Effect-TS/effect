import type { Chunk } from "../../../../collection/immutable/Chunk"

export abstract class Subscription<A> {
  abstract isEmpty(): boolean
  abstract poll(default_: A): A
  abstract pollUpTo(n: number): Chunk<A>
  abstract size(): number
  abstract unsubscribe(): void
}
