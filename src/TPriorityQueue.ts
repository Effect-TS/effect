/**
 * @since 2.0.0
 */
import * as internal from "./internal/stm/tPriorityQueue.js"
import type * as Option from "./Option.js"
import type * as Order from "./Order.js"
import type { Predicate } from "./Predicate.js"
import type * as SortedMap from "./SortedMap.js"
import type * as STM from "./STM.js"
import type * as TRef from "./TRef.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const TPriorityQueueTypeId: unique symbol = internal.TPriorityQueueTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type TPriorityQueueTypeId = typeof TPriorityQueueTypeId

/**
 * A `TPriorityQueue` contains values of type `A` that an `Order` is defined
 * on. Unlike a `TQueue`, `take` returns the highest priority value (the value
 * that is first in the specified ordering) as opposed to the first value
 * offered to the queue. The ordering that elements with the same priority will
 * be taken from the queue is not guaranteed.
 *
 * @since 2.0.0
 * @category models
 */
export interface TPriorityQueue<A> extends TPriorityQueue.Variance<A> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TPriorityQueue<A> {
  /** @internal */
  readonly ref: TRef.TRef<SortedMap.SortedMap<A, [A, ...Array<A>]>>
}

/**
 * @since 2.0.0
 */
export declare namespace TPriorityQueue {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [TPriorityQueueTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

/**
 * Constructs a new empty `TPriorityQueue` with the specified `Order`.
 *
 * @since 2.0.0
 * @category constructors
 */
export const empty: <A>(order: Order.Order<A>) => STM.STM<never, never, TPriorityQueue<A>> = internal.empty

/**
 * Makes a new `TPriorityQueue` initialized with provided iterable.
 *
 * @since 2.0.0
 * @category constructors
 */
export const fromIterable: <A>(
  order: Order.Order<A>
) => (iterable: Iterable<A>) => STM.STM<never, never, TPriorityQueue<A>> = internal.fromIterable

/**
 * Checks whether the queue is empty.
 *
 * @since 2.0.0
 * @category getters
 */
export const isEmpty: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, boolean> = internal.isEmpty

/**
 * Checks whether the queue is not empty.
 *
 * @since 2.0.0
 * @category getters
 */
export const isNonEmpty: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, boolean> = internal.isNonEmpty

/**
 * Makes a new `TPriorityQueue` that is initialized with specified values.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(order: Order.Order<A>) => (...elements: Array<A>) => STM.STM<never, never, TPriorityQueue<A>> =
  internal.make

/**
 * Offers the specified value to the queue.
 *
 * @since 2.0.0
 * @category mutations
 */
export const offer: {
  <A>(value: A): (self: TPriorityQueue<A>) => STM.STM<never, never, void>
  <A>(self: TPriorityQueue<A>, value: A): STM.STM<never, never, void>
} = internal.offer

/**
 * Offers all of the elements in the specified collection to the queue.
 *
 * @since 2.0.0
 * @category mutations
 */
export const offerAll: {
  <A>(values: Iterable<A>): (self: TPriorityQueue<A>) => STM.STM<never, never, void>
  <A>(self: TPriorityQueue<A>, values: Iterable<A>): STM.STM<never, never, void>
} = internal.offerAll

/**
 * Peeks at the first value in the queue without removing it, retrying until a
 * value is in the queue.
 *
 * @since 2.0.0
 * @category getters
 */
export const peek: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, A> = internal.peek

/**
 * Peeks at the first value in the queue without removing it, returning `None`
 * if there is not a value in the queue.
 *
 * @since 2.0.0
 * @category getters
 */
export const peekOption: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, Option.Option<A>> = internal.peekOption

/**
 * Removes all elements from the queue matching the specified predicate.
 *
 * @since 2.0.0
 * @category getters
 */
export const removeIf: {
  <A>(predicate: Predicate<A>): (self: TPriorityQueue<A>) => STM.STM<never, never, void>
  <A>(self: TPriorityQueue<A>, predicate: Predicate<A>): STM.STM<never, never, void>
} = internal.removeIf

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @since 2.0.0
 * @category getters
 */
export const retainIf: {
  <A>(predicate: Predicate<A>): (self: TPriorityQueue<A>) => STM.STM<never, never, void>
  <A>(self: TPriorityQueue<A>, predicate: Predicate<A>): STM.STM<never, never, void>
} = internal.retainIf

/**
 * Returns the size of the queue.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, number> = internal.size

/**
 * Takes a value from the queue, retrying until a value is in the queue.
 *
 * @since 2.0.0
 * @category mutations
 */
export const take: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, A> = internal.take

/**
 * Takes all values from the queue.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeAll: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, Array<A>> = internal.takeAll

/**
 * Takes a value from the queue, returning `None` if there is not a value in
 * the queue.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeOption: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, Option.Option<A>> = internal.takeOption

/**
 * Takes up to the specified maximum number of elements from the queue.
 *
 * @since 2.0.0
 * @category mutations
 */
export const takeUpTo: {
  (n: number): <A>(self: TPriorityQueue<A>) => STM.STM<never, never, Array<A>>
  <A>(self: TPriorityQueue<A>, n: number): STM.STM<never, never, Array<A>>
} = internal.takeUpTo

/**
 * Collects all values into a chunk.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toArray: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, Array<A>> = internal.toChunk

/**
 * Collects all values into an array.
 *
 * @since 2.0.0
 * @category destructors
 */
export const toReadonlyArray: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, ReadonlyArray<A>> =
  internal.toReadonlyArray
