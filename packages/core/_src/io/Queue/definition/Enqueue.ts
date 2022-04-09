import type { CommonQueue } from "@effect/core/io/Queue/definition/common";
import type { _In } from "@effect/core/io/Queue/definition/symbols";

export interface Enqueue<A> extends CommonQueue {
  readonly [_In]: (_: A) => void;

  /**
   * Places one value in the queue.
   */
  readonly offer: (a: A, __tsplusTrace?: string) => UIO<boolean>;

  /**
   * For Bounded Queue: uses the `BackPressure` Strategy, places the values in
   * the queue and always returns true. If the queue has reached capacity, then
   * the fiber performing the `offerAll` will be suspended until there is room
   * in the queue.
   *
   * For Unbounded Queue: Places all values in the queue and returns true.
   *
   * For Sliding Queue: uses `Sliding` Strategy If there is room in the queue,
   * it places the values otherwise it removes the old elements and enqueues the
   * new ones. Always returns true.
   *
   * For Dropping Queue: uses `Dropping` Strategy, It places the values in the
   * queue but if there is no room it will not enqueue them and return false.
   */
  readonly offerAll: (as: Collection<A>, __tsplusTrace?: string) => UIO<boolean>;
}
