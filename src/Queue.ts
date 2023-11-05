/**
 * @since 2.0.0
 */
import type * as Chunk from "./Chunk.js"
import type * as Deferred from "./Deferred.js"
import type * as Effect from "./Effect.js"
import * as internal from "./internal/queue.js"
import type * as MutableQueue from "./MutableQueue.js"
import type * as MutableRef from "./MutableRef.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const EnqueueTypeId: unique symbol = internal.EnqueueTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type EnqueueTypeId = typeof EnqueueTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const DequeueTypeId: unique symbol = internal.DequeueTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type DequeueTypeId = typeof DequeueTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const QueueStrategyTypeId: unique symbol = internal.QueueStrategyTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type QueueStrategyTypeId = typeof QueueStrategyTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Queue<A> extends Enqueue<A>, Dequeue<A>, Pipeable {
  /** @internal */
  readonly queue: BackingQueue<A>
  /** @internal */
  readonly takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  /** @internal */
  readonly shutdownHook: Deferred.Deferred<never, void>
  /** @internal */
  readonly shutdownFlag: MutableRef.MutableRef<boolean>
  /** @internal */
  readonly strategy: Strategy<A>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Enqueue<A> extends Queue.EnqueueVariance<A>, BaseQueue, Pipeable {
  /**
   * Places one value in the queue.
   */
  offer(value: A): Effect.Effect<never, never, boolean>

  /**
   * Places one value in the queue when possible without needing the fiber runtime.
   */
  unsafeOffer(value: A): boolean

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
  offerAll(iterable: Iterable<A>): Effect.Effect<never, never, boolean>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Dequeue<A> extends Queue.DequeueVariance<A>, BaseQueue, Pipeable {
  /**
   * Takes the oldest value in the queue. If the queue is empty, this will return
   * a computation that resumes when an item has been added to the queue.
   */
  take(): Effect.Effect<never, never, A>

  /**
   * Takes all the values in the queue and returns the values. If the queue is
   * empty returns an empty collection.
   */
  takeAll(): Effect.Effect<never, never, Chunk.Chunk<A>>

  /**
   * Takes up to max number of values from the queue.
   */
  takeUpTo(max: number): Effect.Effect<never, never, Chunk.Chunk<A>>

  /**
   * Takes a number of elements from the queue between the specified minimum and
   * maximum. If there are fewer than the minimum number of elements available,
   * suspends until at least the minimum number of elements have been collected.
   */
  takeBetween(min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<A>>
}

/**
 * The base interface that all `Queue`s must implement.
 *
 * @since 2.0.0
 * @category models
 */
export interface BaseQueue {
  /**
   * Returns the number of elements the queue can hold.
   */
  capacity(): number

  /**
   * Returns false if shutdown has been called.
   */
  isActive(): boolean

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  size(): Effect.Effect<never, never, number>

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue. Returns None if shutdown has been called
   */
  unsafeSize(): Option.Option<number>

  /**
   * Returns `true` if the `Queue` contains at least one element, `false`
   * otherwise.
   */
  isFull(): Effect.Effect<never, never, boolean>

  /**
   * Returns `true` if the `Queue` contains zero elements, `false` otherwise.
   */
  isEmpty(): Effect.Effect<never, never, boolean>

  /**
   * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
   * to `offer*` and `take*` will be interrupted immediately.
   */
  shutdown(): Effect.Effect<never, never, void>

  /**
   * Returns `true` if `shutdown` has been called, otherwise returns `false`.
   */
  isShutdown(): Effect.Effect<never, never, boolean>

  /**
   * Waits until the queue is shutdown. The `Effect` returned by this method will
   * not resume until the queue has been shutdown. If the queue is already
   * shutdown, the `Effect` will resume right away.
   */
  awaitShutdown(): Effect.Effect<never, never, void>
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Strategy<A> extends Queue.StrategyVariance<A> {
  /**
   * Returns the number of surplus values that were unable to be added to the
   * `Queue`
   */
  surplusSize(): number

  /**
   * Determines how the `Queue.Strategy` should shut down when the `Queue` is
   * shut down.
   */
  shutdown(): Effect.Effect<never, never, void>

  /**
   * Determines the behavior of the `Queue.Strategy` when there are surplus
   * values that could not be added to the `Queue` following an `offer`
   * operation.
   */
  handleSurplus(
    iterable: Iterable<A>,
    queue: BackingQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean>

  /**
   * It is called when the backing queue is empty but there are some
   * takers that can be completed
   */
  onCompleteTakersWithEmptyQueue(
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void

  /**
   * Determines the behavior of the `Queue.Strategy` when the `Queue` has empty
   * slots following a `take` operation.
   */
  unsafeOnQueueEmptySpace(
    queue: BackingQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  ): void
}

/**
 * @since 2.0.0
 * @category models
 */
export interface BackingQueue<A> {
  /**
   * Dequeues an element from the queue.
   * Returns either an element from the queue, or the `def` param.
   */
  poll<Def>(def: Def): A | Def
  /**
   * Dequeues up to `limit` elements from the queue.
   */
  pollUpTo(limit: number): Chunk.Chunk<A>
  /**
   * Enqueues a collection of values into the queue.
   *
   * Returns a `Chunk` of the values that were **not** able to be enqueued.
   */
  offerAll(elements: Iterable<A>): Chunk.Chunk<A>
  /**
   * Offers an element to the queue.
   *
   * Returns whether the enqueue was successful or not.
   */
  offer(element: A): boolean
  /**
   * The **maximum** number of elements that a queue can hold.
   *
   * **Note**: unbounded queues can still implement this interface with
   * `capacity = Infinity`.
   */
  capacity(): number
  /**
   * Returns the number of elements currently in the queue
   */
  length(): number
}

/**
 * @since 2.0.0
 */
export declare namespace Queue {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface EnqueueVariance<A> {
    readonly [EnqueueTypeId]: {
      readonly _In: (_: A) => void
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface DequeueVariance<A> {
    readonly [DequeueTypeId]: {
      readonly _Out: (_: never) => A
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface StrategyVariance<A> {
    readonly [QueueStrategyTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Returns `true` if the specified value is a `Queue`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isQueue: (u: unknown) => u is Queue<unknown> = internal.isQueue

/**
 * Returns `true` if the specified value is a `Dequeue`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isDequeue: (u: unknown) => u is Dequeue<unknown> = internal.isDequeue

/**
 * Returns `true` if the specified value is a `Enqueue`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isEnqueue: (u: unknown) => u is Enqueue<unknown> = internal.isEnqueue

/**
 * @since 2.0.0
 * @category strategies
 */
export const backPressureStrategy: <A>() => Strategy<A> = internal.backPressureStrategy

/**
 * @since 2.0.0
 * @category strategies
 */
export const droppingStrategy: <A>() => Strategy<A> = internal.droppingStrategy

/**
 * @since 2.0.0
 * @category strategies
 */
export const slidingStrategy: <A>() => Strategy<A> = internal.slidingStrategy

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(queue: BackingQueue<A>, strategy: Strategy<A>) => Effect.Effect<never, never, Queue<A>> =
  internal.make

/**
 * Makes a new bounded `Queue`. When the capacity of the queue is reached, any
 * additional calls to `offer` will be suspended until there is more room in
 * the queue.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const bounded: <A>(requestedCapacity: number) => Effect.Effect<never, never, Queue<A>> = internal.bounded

/**
 * Makes a new bounded `Queue` with the dropping strategy.
 *
 * When the capacity of the queue is reached, new elements will be dropped and the
 * old elements will remain.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dropping: <A>(requestedCapacity: number) => Effect.Effect<never, never, Queue<A>> = internal.dropping

/**
 * Makes a new bounded `Queue` with the sliding strategy.
 *
 * When the capacity of the queue is reached, new elements will be added and the
 * old elements will be dropped.
 *
 * **Note**: When possible use only power of 2 capacities; this will provide
 * better performance by utilising an optimised version of the underlying
 * `RingBuffer`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sliding: <A>(requestedCapacity: number) => Effect.Effect<never, never, Queue<A>> = internal.sliding

/**
 * Creates a new unbounded `Queue`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unbounded: <A>() => Effect.Effect<never, never, Queue<A>> = internal.unbounded

/**
 * Returns the number of elements the queue can hold.
 *
 * @since 2.0.0
 * @category getters
 */
export const capacity: <A>(self: Dequeue<A> | Enqueue<A>) => number = internal.capacity

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, number> = internal.size

/**
 * Returns `true` if the `Queue` contains zero elements, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isEmpty: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, boolean> = internal.isEmpty

/**
 * Returns `true` if the `Queue` contains at least one element, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isFull: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, boolean> = internal.isFull

/**
 * Returns `true` if `shutdown` has been called, otherwise returns `false`.
 *
 * @since 2.0.0
 * @category getters
 */
export const isShutdown: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, boolean> =
  internal.isShutdown

/**
 * Waits until the queue is shutdown. The `Effect` returned by this method will
 * not resume until the queue has been shutdown. If the queue is already
 * shutdown, the `Effect` will resume right away.
 *
 * @since 2.0.0
 * @category utils
 */
export const awaitShutdown: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, void> =
  internal.awaitShutdown

/**
 * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
 * to `offer*` and `take*` will be interrupted immediately.
 *
 * @since 2.0.0
 * @category utils
 */
export const shutdown: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, void> = internal.shutdown

/**
 * Places one value in the queue.
 *
 * @since 2.0.0
 * @category utils
 */
export const offer: {
  <A>(value: A): (self: Enqueue<A>) => Effect.Effect<never, never, boolean>
  <A>(self: Enqueue<A>, value: A): Effect.Effect<never, never, boolean>
} = internal.offer

/**
 * Places one value in the queue.
 *
 * @since 2.0.0
 * @category utils
 */
export const unsafeOffer: {
  <A>(value: A): (self: Enqueue<A>) => boolean
  <A>(self: Enqueue<A>, value: A): boolean
} = internal.unsafeOffer

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
 *
 * @since 2.0.0
 * @category utils
 */
export const offerAll: {
  <A>(iterable: Iterable<A>): (self: Enqueue<A>) => Effect.Effect<never, never, boolean>
  <A>(self: Enqueue<A>, iterable: Iterable<A>): Effect.Effect<never, never, boolean>
} = internal.offerAll

/**
 * Returns the first value in the `Queue` as a `Some<A>`, or `None` if the queue
 * is empty.
 *
 * @since 2.0.0
 * @category utils
 */
export const poll: <A>(self: Dequeue<A>) => Effect.Effect<never, never, Option.Option<A>> = internal.poll

/**
 * Takes the oldest value in the queue. If the queue is empty, this will return
 * a computation that resumes when an item has been added to the queue.
 *
 * @since 2.0.0
 * @category utils
 */
export const take: <A>(self: Dequeue<A>) => Effect.Effect<never, never, A> = internal.take

/**
 * Takes all the values in the queue and returns the values. If the queue is
 * empty returns an empty collection.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeAll: <A>(self: Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>> = internal.takeAll

/**
 * Takes up to max number of values from the queue.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeUpTo: {
  (max: number): <A>(self: Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
  <A>(self: Dequeue<A>, max: number): Effect.Effect<never, never, Chunk.Chunk<A>>
} = internal.takeUpTo

/**
 * Takes a number of elements from the queue between the specified minimum and
 * maximum. If there are fewer than the minimum number of elements available,
 * suspends until at least the minimum number of elements have been collected.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeBetween: {
  (min: number, max: number): <A>(self: Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
  <A>(self: Dequeue<A>, min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<A>>
} = internal.takeBetween

/**
 * Takes the specified number of elements from the queue. If there are fewer
 * than the specified number of elements available, it suspends until they
 * become available.
 *
 * @since 2.0.0
 * @category utils
 */
export const takeN: {
  (n: number): <A>(self: Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
  <A>(self: Dequeue<A>, n: number): Effect.Effect<never, never, Chunk.Chunk<A>>
} = internal.takeN
