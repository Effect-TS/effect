import type { Subscription } from "@effect-ts/core/io/Hub/operations/_internal/Subscription";

export interface AtomicHub<A> {
  readonly capacity: number;
  isEmpty(): boolean;
  isFull(): boolean;
  publish(a: A): boolean;
  publishAll(as: Collection<A>): Chunk<A>;
  size(): number;
  slide(): void;
  subscribe(): Subscription<A>;
}
