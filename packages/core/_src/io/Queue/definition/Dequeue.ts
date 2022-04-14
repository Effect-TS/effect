import type { CommonQueue } from "@effect/core/io/Queue/definition/common";
import type { _Out } from "@effect/core/io/Queue/definition/symbols";

export interface Dequeue<A> extends CommonQueue {
  readonly [_Out]: () => A;

  /**
   * Removes the oldest value in the queue. If the queue is empty, this will
   * return a computation that resumes when an item has been added to the queue.
   */
  readonly take: Effect.UIO<A>;

  /**
   * Removes all the values in the queue and returns the values. If the queue is
   * empty returns an empty collection.
   */
  readonly takeAll: Effect.UIO<Chunk<A>>;

  /**
   * Takes up to max number of values from the queue.
   */
  readonly takeUpTo: (max: number, __tsplusTrace?: string) => Effect.UIO<Chunk<A>>;
}
