/**
 * @since 2.0.0
 */
import type * as Effect from "./Effect"
import type * as HashSet from "./HashSet"
import * as internal from "./internal/stm/tHub"
import type * as tQueue from "./internal/stm/tQueue"
import type * as Scope from "./Scope"
import type * as STM from "./STM"
import type * as TQueue from "./TQueue"
import type * as TRef from "./TRef"

/**
 * @since 2.0.0
 * @category symbols
 */
export const THubTypeId: unique symbol = internal.THubTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type THubTypeId = typeof THubTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface THub<A> extends TQueue.TEnqueue<A> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface THub<A> {
  readonly [THubTypeId]: THubTypeId
  /** @internal */
  readonly hubSize: TRef.TRef<number>
  /** @internal */
  readonly publisherHead: TRef.TRef<TRef.TRef<internal.Node<A> | undefined>>
  /** @internal */
  readonly publisherTail: TRef.TRef<TRef.TRef<internal.Node<A> | undefined> | undefined>
  /** @internal */
  readonly requestedCapacity: number
  /** @internal */
  readonly strategy: tQueue.TQueueStrategy
  /** @internal */
  readonly subscriberCount: TRef.TRef<number>
  /** @internal */
  readonly subscribers: TRef.TRef<HashSet.HashSet<TRef.TRef<TRef.TRef<internal.Node<A>> | undefined>>>
}

/**
 * Waits until the hub is shutdown. The `STM` returned by this method will
 * not resume until the queue has been shutdown. If the hub is already
 * shutdown, the `STM` will resume right away.
 *
 * @since 2.0.0
 * @category mutations
 */
export const awaitShutdown: <A>(self: THub<A>) => STM.STM<never, never, void> = internal.awaitShutdown

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * @since 2.0.0
 * @category constructors
 */
export const bounded: <A>(requestedCapacity: number) => STM.STM<never, never, THub<A>> = internal.bounded

/**
 * Returns the number of elements the hub can hold.
 *
 * @since 2.0.0
 * @category getters
 */
export const capacity: <A>(self: THub<A>) => number = internal.capacity

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * @since 2.0.0
 * @category constructors
 */
export const dropping: <A>(requestedCapacity: number) => STM.STM<never, never, THub<A>> = internal.dropping

/**
 * Returns `true` if the `THub` contains zero elements, `false` otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isEmpty: <A>(self: THub<A>) => STM.STM<never, never, boolean> = internal.isEmpty

/**
 * Returns `true` if the `THub` contains at least one element, `false`
 * otherwise.
 *
 * @since 2.0.0
 * @category getters
 */
export const isFull: <A>(self: THub<A>) => STM.STM<never, never, boolean> = internal.isFull

/**
 * Returns `true` if `shutdown` has been called, otherwise returns `false`.
 *
 * @since 2.0.0
 * @category getters
 */
export const isShutdown: <A>(self: THub<A>) => STM.STM<never, never, boolean> = internal.isShutdown

/**
 * Publishes a message to the hub, returning whether the message was published
 * to the hub.
 *
 * @since 2.0.0
 * @category mutations
 */
export const publish: {
  <A>(value: A): (self: THub<A>) => STM.STM<never, never, boolean>
  <A>(self: THub<A>, value: A): STM.STM<never, never, boolean>
} = internal.publish

/**
 * Publishes all of the specified messages to the hub, returning whether they
 * were published to the hub.
 *
 * @since 2.0.0
 * @category mutations
 */
export const publishAll: {
  <A>(iterable: Iterable<A>): (self: THub<A>) => STM.STM<never, never, boolean>
  <A>(self: THub<A>, iterable: Iterable<A>): STM.STM<never, never, boolean>
} = internal.publishAll

/**
 * Retrieves the size of the hub, which is equal to the number of elements
 * in the hub. This may be negative if fibers are suspended waiting for
 * elements to be added to the hub.
 *
 * @since 2.0.0
 * @category getters
 */
export const size: <A>(self: THub<A>) => STM.STM<never, never, number> = internal.size

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @since 2.0.0
 * @category constructors
 */
export const sliding: <A>(requestedCapacity: number) => STM.STM<never, never, THub<A>> = internal.sliding

/**
 * Subscribes to receive messages from the hub. The resulting subscription can
 * be evaluated multiple times to take a message from the hub each time. The
 * caller is responsible for unsubscribing from the hub by shutting down the
 * queue.
 *
 * @since 2.0.0
 * @category mutations
 */
export const subscribe: <A>(self: THub<A>) => STM.STM<never, never, TQueue.TDequeue<A>> = internal.subscribe

/**
 * Subscribes to receive messages from the hub. The resulting subscription can
 * be evaluated multiple times within the scope to take a message from the hub
 * each time.
 *
 * @since 2.0.0
 * @category mutations
 */
export const subscribeScoped: <A>(self: THub<A>) => Effect.Effect<Scope.Scope, never, TQueue.TDequeue<A>> =
  internal.subscribeScoped

/**
 * Creates an unbounded hub.
 *
 * @since 2.0.0
 * @category constructors
 */
export const unbounded: <A>() => STM.STM<never, never, THub<A>> = internal.unbounded
