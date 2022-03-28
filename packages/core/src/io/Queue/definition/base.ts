import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect, UIO } from "../../Effect"
import { _A, _B, _EA, _EB, _RA, _RB } from "./symbols"

/**
 * A `Queue<A>` is a lightweight, asynchronous queue into which values of type
 * `A` can be enqueued and dequeued.
 *
 * @tsplus type ets/Queue
 */
export interface Queue<A> extends XQueue<unknown, unknown, never, never, A, A> {}

/**
 * @tsplus type ets/QueueOps
 */
export interface QueueOps {}
export const Queue: QueueOps = {}

export function unifyQueue<X extends Queue<any>>(
  self: X
): Queue<[X] extends [{ [k in typeof _A]: (_: infer A) => void }] ? A : never> {
  return self
}

/**
 * A queue that can only be dequeued.
 *
 * @tsplus type ets/Dequeue
 */
export interface Dequeue<A> extends XQueue<never, unknown, unknown, never, never, A> {}

/**
 * @tsplus type ets/DequeueOps
 */
export interface DequeueOps {}
export const Dequeue: DequeueOps = {}

export function unifyDequeue<X extends Dequeue<any>>(
  self: X
): Dequeue<[X] extends [{ [k in typeof _B]: () => infer B }] ? B : never> {
  return self
}

/**
 * @tsplus type ets/XDequeue
 */
export interface XDequeue<R, E, A> extends XQueue<never, R, unknown, E, never, A> {}

/**
 * @tsplus type ets/XDequeueOps
 */
export interface XDequeueOps {}
export const XDequeue: XDequeueOps = {}

export function unifyXDequeue<X extends XDequeue<any, any, any>>(
  self: X
): XDequeue<
  [X] extends [{ [k in typeof _RB]: (_: infer RB) => void }] ? RB : never,
  [X] extends [{ [k in typeof _EB]: () => infer EB }] ? EB : never,
  [X] extends [{ [k in typeof _B]: () => infer B }] ? B : never
> {
  return self
}

/**
 * A queue that can only be enqueued.
 *
 * @tsplus type ets/Enqueue
 */
export interface Enqueue<A> extends XQueue<unknown, never, never, unknown, A, any> {}

/**
 * @tsplus type ets/EnqueueOps
 */
export interface EnqueueOps {}
export const Enqueue: EnqueueOps = {}

export function unifyEnqueue<X extends Enqueue<any>>(
  self: X
): Enqueue<[X] extends [{ [k in typeof _A]: (_: infer A) => void }] ? A : never> {
  return self
}

/**
 * @tsplus type ets/XEnqueue
 */
export interface XEnqueue<R, E, A> extends XQueue<R, never, E, unknown, A, any> {}

/**
 * @tsplus type ets/XEnqueueOps
 */
export interface XEnqueueOps {}
export const XEnqueue: XEnqueueOps = {}

export function unifyXEnqueue<X extends XEnqueue<any, any, any>>(
  self: X
): XEnqueue<
  [X] extends [{ [k in typeof _RA]: (_: infer RA) => void }] ? RA : never,
  [X] extends [{ [k in typeof _EA]: () => infer EA }] ? EA : never,
  [X] extends [{ [k in typeof _A]: (_: infer A) => void }] ? A : never
> {
  return self
}

/**
 * A `XQueue<RA, RB, EA, EB, A, B>` is a lightweight, asynchronous queue into
 * which values of type `A` can be enqueued and of which elements of type `B`
 * can be dequeued. The queue's enqueueing operations may utilize an environment
 * of type `RA` and may fail with errors of type `EA`. The dequeueing operations
 * may utilize an environment of type `RB` and may fail with errors of type `EB`.
 *
 * @tsplus type ets/XQueue
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
 * @tsplus unify ets/XQueue
 */
export function unifyXQueue<X extends XQueue<any, any, any, any, any, any>>(
  self: X
): XQueue<
  [X] extends [{ [k in typeof _RA]: (_: infer RA) => void }] ? RA : never,
  [X] extends [{ [k in typeof _RB]: (_: infer RB) => void }] ? RB : never,
  [X] extends [{ [k in typeof _EA]: () => infer EA }] ? EA : never,
  [X] extends [{ [k in typeof _EB]: () => infer EB }] ? EB : never,
  [X] extends [{ [k in typeof _A]: (_: infer A) => void }] ? A : never,
  [X] extends [{ [k in typeof _B]: () => infer B }] ? B : never
> {
  return self
}

/**
 * @tsplus type ets/XQueueOps
 */
export interface XQueueOps {}
export const XQueue: XQueueOps = {}

/**
 * @tsplus macro remove
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
   * Waits until the queue is shutdown. The `IO` returned by this method will
   * not resume until the queue has been shutdown. If the queue is already
   * shutdown, the `IO` will resume right away.
   */
  abstract readonly _awaitShutdown: UIO<void>

  /**
   * Retrieves the number elements the queue can hold.
   */
  abstract readonly _capacity: number

  /**
   * Whether or not the queue is shutdown. Will be `true` if `shutdown` has
   * been called.
   */
  abstract readonly _isShutdown: UIO<boolean>

  /**
   * Places one value in the queue.
   */
  abstract _offer(a: A): Effect<RA, EA, boolean>

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
  abstract _offerAll(as: Iterable<A>): Effect<RA, EA, boolean>

  /**
   * Interrupts any fibers that are suspended on `offer` or `take`.
   * Future calls to `offer*` and `take*` will be interrupted immediately.
   */
  abstract readonly _shutdown: UIO<void>

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  abstract readonly _size: UIO<number>

  /**
   * Removes the oldest value in the queue. If the queue is empty, this will
   * return a computation that resumes when an item has been added to the queue.
   */
  abstract readonly _take: Effect<RB, EB, B>

  /**
   * Removes all the values in the queue and returns the values. If the queue is
   * empty returns an empty collection.
   */
  abstract readonly _takeAll: Effect<RB, EB, Chunk<B>>

  /**
   * Takes up to max number of values in the queue.
   */
  abstract _takeUpTo(n: number): Effect<RB, EB, Chunk<B>>
}
