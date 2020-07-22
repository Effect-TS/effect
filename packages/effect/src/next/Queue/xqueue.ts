import { Async, AsyncRE, Sync } from "../Effect/effect"

/**
 * A `XQueue<RA, RB, EA, EB, A, B>` is a lightweight, asynchronous queue into which values of
 * type `A` can be enqueued and of which elements of type `B` can be dequeued. The queue's
 * enqueueing operations may utilize an environment of type `RA` and may fail with errors of
 * type `EA`. The dequeueing operations may utilize an environment of type `RB` and may fail
 * with errors of type `EB`.
 */
export abstract class XQueue<RA, RB, EA, EB, A, B> {
  /**
   * Waits until the queue is shutdown.
   * The `IO` returned by this method will not resume until the queue has been shutdown.
   * If the queue is already shutdown, the `IO` will resume right away.
   */
  abstract readonly awaitShutdown: Async<void>
  /**
   * How many elements can hold in the queue
   */
  abstract readonly capacity: number
  /**
   * `true` if `shutdown` has been called.
   */
  abstract readonly isShutdown: Sync<boolean>
  /**
   * Places one value in the queue.
   */
  abstract readonly offer: (a: A) => AsyncRE<RA, EA, boolean>
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
  abstract readonly offerAll: (as: Iterable<A>) => AsyncRE<RA, EA, boolean>
  /**
   * Interrupts any fibers that are suspended on `offer` or `take`.
   * Future calls to `offer*` and `take*` will be interrupted immediately.
   */
  abstract readonly shutdown: Async<void>
  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  abstract readonly size: Async<number>
  /**
   * Removes the oldest value in the queue. If the queue is empty, this will
   * return a computation that resumes when an item has been added to the queue.
   */
  abstract readonly take: AsyncRE<RB, EB, B>
  /**
   * Removes all the values in the queue and returns the list of the values. If the queue
   * is empty returns empty list.
   */
  abstract readonly takeAll: AsyncRE<RB, EB, readonly B[]>
  /**
   * Takes up to max number of values in the queue.
   */
  abstract readonly takeUpTo: (n: number) => AsyncRE<RB, EB, readonly B[]>
}

/**
 * A `Queue<A>` is a lightweight, asynchronous queue into which
 * values of type `A` can be enqueued and dequeued.
 */
export interface Queue<A> extends XQueue<unknown, unknown, never, never, A, A> {}
