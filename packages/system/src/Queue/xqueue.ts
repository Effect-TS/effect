// ets_tracing: off

import type * as Chunk from "../Collections/Immutable/Chunk/index.js"
import type { Effect, UIO } from "../Effect/effect.js"

export const _RA = Symbol()
export type _RA = typeof _RA
export const _RB = Symbol()
export type _RB = typeof _RB
export const _EA = Symbol()
export type _EA = typeof _EA
export const _EB = Symbol()
export type _EB = typeof _EB
export const _A = Symbol()
export type _A = typeof _A
export const _B = Symbol()
export type _B = typeof _B

/**
 * A `XQueue<RA, RB, EA, EB, A, B>` is a lightweight, asynchronous queue into which values of
 * type `A` can be enqueued and of which elements of type `B` can be dequeued. The queue's
 * enqueueing operations may utilize an environment of type `RA` and may fail with errors of
 * type `EA`. The dequeueing operations may utilize an environment of type `RB` and may fail
 * with errors of type `EB`.
 */
export interface XQueue<RA, RB, EA, EB, A, B> {
  readonly [_RA]: (_: RA) => void
  readonly [_RB]: (_: RB) => void
  readonly [_EA]: () => EA
  readonly [_EB]: () => EB
  readonly [_A]: (_: A) => void
  readonly [_B]: () => B
}

/**
 * @ets_optimize remove
 */
export function concreteQueue<RA, RB, EA, EB, A, B>(
  _: XQueue<RA, RB, EA, EB, A, B>
): asserts _ is XQueueInternal<RA, RB, EA, EB, A, B> {
  //
}

export abstract class XQueueInternal<RA, RB, EA, EB, A, B>
  implements XQueue<RA, RB, EA, EB, A, B>
{
  readonly [_RA]!: (_: RA) => void;
  readonly [_RB]!: (_: RB) => void;
  readonly [_EA]!: () => EA;
  readonly [_EB]!: () => EB;
  readonly [_A]!: (_: A) => void;
  readonly [_B]!: () => B

  /**
   * Waits until the queue is shutdown.
   * The `IO` returned by this method will not resume until the queue has been shutdown.
   * If the queue is already shutdown, the `IO` will resume right away.
   */
  abstract readonly awaitShutdown: UIO<void>

  /**
   * How many elements can hold in the queue
   */
  abstract readonly capacity: number

  /**
   * `true` if `shutdown` has been called.
   */
  abstract readonly isShutdown: UIO<boolean>

  /**
   * Places one value in the queue.
   */
  abstract offer(a: A): Effect<RA, EA, boolean>

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
  abstract offerAll(as: Iterable<A>): Effect<RA, EA, boolean>

  /**
   * Interrupts any fibers that are suspended on `offer` or `take`.
   * Future calls to `offer*` and `take*` will be interrupted immediately.
   */
  abstract readonly shutdown: UIO<void>

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  abstract readonly size: UIO<number>

  /**
   * Removes the oldest value in the queue. If the queue is empty, this will
   * return a computation that resumes when an item has been added to the queue.
   */
  abstract readonly take: Effect<RB, EB, B>

  /**
   * Removes all the values in the queue and returns the list of the values. If the queue
   * is empty returns empty list.
   */
  abstract readonly takeAll: Effect<RB, EB, Chunk.Chunk<B>>

  /**
   * Takes up to max number of values in the queue.
   */
  abstract takeUpTo(n: number): Effect<RB, EB, Chunk.Chunk<B>>
}

/**
 * A `Queue<A>` is a lightweight, asynchronous queue into which
 * values of type `A` can be enqueued and dequeued.
 */
export interface Queue<A> extends XQueue<unknown, unknown, never, never, A, A> {}

/**
 * A queue that can only be dequeued.
 */
export interface Dequeue<A> extends XQueue<never, unknown, unknown, never, never, A> {}

export interface XDequeue<R, E, A> extends XQueue<never, R, unknown, E, never, A> {}

/**
 * A queue that can only be enqueued.
 */
export interface Enqueue<A> extends XQueue<unknown, never, never, unknown, A, any> {}

export interface XEnqueue<R, E, A> extends XQueue<R, never, E, unknown, A, any> {}
