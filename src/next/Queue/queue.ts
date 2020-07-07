import { Async, Sync } from "../Effect/effect"

/**
 * A `Queue<A> is a lightweight, asynchronous queue into which
 * values of type `A` can be enqueued and dequeued.
 */
export interface Queue<A> {
  /**
   * Waits until the queue is shutdown.
   * The `IO` returned by this method will not resume until the queue has been shutdown.
   * If the queue is already shutdown, the `IO` will resume right away.
   */
  readonly waitShutdown: Async<void>

  /**
   * How many elements can hold in the queue
   */

  readonly capacity: number

  /**
   * `true` if `shutdown` has been called.
   */

  readonly isShutdown: Sync<boolean>

  /**
   * Places one value in the queue.
   */

  readonly offer: (a: A) => Async<boolean>

  /**
   * For Bounded Queue: uses the `BackPressure` Strategy, places the values in the queue and always returns true.
   * If the queue has reached capacity, then
   * the fiber performing the `offerAll` will be suspended until there is room in
   * the queue.
   *
   * For Unbounded Queue:
   * Places all values in the queue and returns true.
   *
   * For Sliding Queue: uses `Sliding` Strategy
   * If there is room in the queue, it places the values otherwise it removes the old elements and
   * enqueues the new ones. Always returns true.
   *
   * For Dropping Queue: uses `Dropping` Strategy,
   * It places the values in the queue but if there is no room it will not enqueue them and return false.
   *
   */

  readonly offerAll: (as: Iterable<A>) => Async<boolean>

  /**
   * Interrupts any fibers that are suspended on `offer` or `take`.
   * Future calls to `offer*` and `take*` will be interrupted immediately.
   */

  readonly shutdown: Async<void>

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */

  readonly size: Async<number>

  /**
   * Removes the oldest value in the queue. If the queue is empty, this will
   * return a computation that resumes when an item has been added to the queue.
   */

  readonly take: Async<A>

  /**
   * Removes all the values in the queue and returns the list of the values. If the queue
   * is empty returns empty list.
   */

  readonly takeAll: Sync<readonly A[]>

  /**
   * Takes up to max number of values in the queue.
   */

  readonly takeUpTo: (max: number) => Sync<readonly A[]>
}
