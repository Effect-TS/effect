export const QueueSym = Symbol.for("@effect-ts/core/io/Queue");
export type QueueSym = typeof QueueSym;

export interface CommonQueue {
  readonly [QueueSym]: QueueSym;

  /**
   * How many elements the queue can hold.
   */
  readonly capacity: number;

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  readonly size: UIO<number>;

  /**
   * Waits until the queue is shutdown. The `IO` returned by this method will
   * not resume until the queue has been shutdown. If the queue is already
   * shutdown, the `IO` will resume right away.
   */
  readonly awaitShutdown: UIO<void>;

  /**
   * Returns `true` if `shutdown` has been called, otherwise returns `false`.
   */
  readonly isShutdown: UIO<boolean>;

  /**
   * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
   * to `offer*` and `take*` will be interrupted immediately.
   */
  readonly shutdown: UIO<void>;
}
