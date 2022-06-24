import { _Out } from "@effect/core/io/Queue/definition/symbols"
import type { _In } from "@effect/core/io/Queue/definition/symbols"

export interface Enqueue<A> extends CommonQueue<A> {
  /**
   * Internal Variance Marker
   */
  readonly [_In]: (_: A) => void
  /**
   * Places one value in the queue.
   */
  readonly offer: (a: A, __tsplusTrace?: string) => Effect<never, never, boolean>
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
  readonly offerAll: (as: Collection<A>, __tsplusTrace?: string) => Effect<never, never, boolean>
}

export const QueueSym = Symbol.for("@effect/core/io/Queue")
export type QueueSym = typeof QueueSym

export interface CommonQueue<A> {
  /**
   * Internal Discriminator
   */
  get [QueueSym](): QueueSym
  /**
   * How many elements the queue can hold.
   */
  get capacity(): number
  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  get size(): Effect<never, never, number>
  /**
   * Waits until the queue is shutdown. The `IO` returned by this method will
   * not resume until the queue has been shutdown. If the queue is already
   * shutdown, the `IO` will resume right away.
   */
  get awaitShutdown(): Effect<never, never, void>
  /**
   * Returns `true` if `shutdown` has been called, otherwise returns `false`.
   */
  get isShutdown(): Effect<never, never, boolean>
  /**
   * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
   * to `offer*` and `take*` will be interrupted immediately.
   */
  get shutdown(): Effect<never, never, void>
  /**
   * Checks whether the queue is currently full.
   */
  isFull(this: Enqueue<A> | Dequeue<A>, __tsplusTrace?: string): Effect<never, never, boolean>
  /**
   * Checks whether the queue is currently empty.
   */
  isEmpty(this: Enqueue<A> | Dequeue<A>, __tsplusTrace?: string): Effect<never, never, boolean>
}

export interface Dequeue<A> extends CommonQueue<A> {
  /**
   * Internal Variance Marker
   */
  get [_Out](): () => A
  /**
   * Removes the oldest value in the queue. If the queue is empty, this will
   * return a computation that resumes when an item has been added to the queue.
   */
  get take(): Effect<never, never, A>
  /**
   * Removes all the values in the queue and returns the values. If the queue is
   * empty returns an empty collection.
   */
  get takeAll(): Effect<never, never, Chunk<A>>
  /**
   * Takes up to max number of values from the queue.
   */
  takeUpTo(this: Dequeue<A>, max: number, __tsplusTrace?: string): Effect<never, never, Chunk<A>>
  /**
   * Takes a number of elements from the queue between the specified minimum and
   * maximum. If there are fewer than the minimum number of elements available,
   * suspends until at least the minimum number of elements have been collected.
   */
  takeBetween(this: Dequeue<A>, min: number, max: number): Effect<never, never, Chunk<A>>
  /**
   * Takes the specified number of elements from the queue. If there are fewer
   * than the specified number of elements available, it suspends until they
   * become available.
   */
  takeN(this: Dequeue<A>, n: number, __tsplusTrace?: string): Effect<never, never, Chunk<A>>
  /**
   * Take the head option of values in the queue.
   */
  poll(this: Dequeue<A>, __tsplusTrace?: string): Effect<never, never, Maybe<A>>
}

export const CommonProto = {
  get [QueueSym](): QueueSym {
    return QueueSym
  },
  isFull<A>(this: Enqueue<A> | Dequeue<A>, __tsplusTrace?: string) {
    return this.size.map((size) => size === this.capacity)
  },
  isEmpty<A>(this: Queue<A>, __tsplusTrace?: string): Effect<never, never, boolean> {
    return this.size.map((size) => size === 0)
  }
}

export const DequeueProto = {
  poll<A>(this: Dequeue<A>, __tsplusTrace?: string): Effect<never, never, Maybe<A>> {
    return this.takeUpTo(1).map((chunk) => chunk.head)
  },
  takeN<A>(this: Dequeue<A>, n: number, __tsplusTrace?: string): Effect<never, never, Chunk<A>> {
    return this.takeBetween(n, n)
  },
  takeBetween<A>(this: Dequeue<A>, min: number, max: number): Effect<never, never, Chunk<A>> {
    return Effect.suspendSucceed(takeRemainderLoop(this, min, max, Chunk.empty()))
  }
}

export const QueueProto = /* #__PURE__ */ {
  ...CommonProto,
  ...DequeueProto
}

function takeRemainderLoop<A>(
  self: Dequeue<A>,
  min: number,
  max: number,
  acc: Chunk<A>,
  __tsplusTrace?: string
): Effect<never, never, Chunk<A>> {
  if (max < min) {
    return Effect.succeedNow(acc)
  }
  return self.takeUpTo(max).flatMap((bs) => {
    const remaining = min - bs.length

    if (remaining === 1) {
      return self.take.map((b) => (acc + bs).append(b))
    }

    if (remaining > 1) {
      return self.take.flatMap((b) =>
        takeRemainderLoop(
          self,
          remaining - 1,
          max - bs.length - 1,
          (acc + bs).append(b)
        )
      )
    }

    return Effect.succeedNow(acc + bs)
  })
}

/**
 * A `Queue` is a lightweight, asynchronous queue into which values can be
 * enqueued and of which elements can be dequeued.
 *
 * @tsplus type ets/Queue
 */
export interface Queue<A> extends Enqueue<A>, Dequeue<A> {}

/**
 * @tsplus type ets/Queue/Ops
 */
export interface QueueOps {
  $: QueueAspects
}
export const Queue: QueueOps = {
  $: {}
}

/**
 * @tsplus type ets/Queue/Aspects
 */
export interface QueueAspects {}

export type AbstractQueue<K, P> = {
  -readonly [k in keyof K as k extends (keyof P) | symbol ? never : k]: K[k]
} extends infer Q ? Q : never
