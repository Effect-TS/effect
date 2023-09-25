/**
 * @since 1.0.0
 */
import type * as Effect from "./Effect"
import * as internal from "./internal/hub"
import type { Pipeable } from "./Pipeable"
import type * as Queue from "./Queue"
import type * as Scope from "./Scope"

/**
 * A `Hub<A>` is an asynchronous message hub into which publishers can publish
 * messages of type `A` and subscribers can subscribe to take messages of type
 * `A`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Hub<A> extends Queue.Enqueue<A>, Pipeable {
  /**
   * Publishes a message to the hub, returning whether the message was published
   * to the hub.
   */
  publish(value: A): Effect.Effect<never, never, boolean>

  /**
   * Publishes all of the specified messages to the hub, returning whether they
   * were published to the hub.
   */
  publishAll(elements: Iterable<A>): Effect.Effect<never, never, boolean>

  /**
   * Subscribes to receive messages from the hub. The resulting subscription can
   * be evaluated multiple times within the scope to take a message from the hub
   * each time.
   */
  subscribe(): Effect.Effect<Scope.Scope, never, Queue.Dequeue<A>>
}

/**
 * Creates a bounded hub with the back pressure strategy. The hub will retain
 * messages until they have been taken by all subscribers, applying back
 * pressure to publishers if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @since 1.0.0
 * @category constructors
 */
export const bounded: <A>(requestedCapacity: number) => Effect.Effect<never, never, Hub<A>> = internal.bounded

/**
 * Creates a bounded hub with the dropping strategy. The hub will drop new
 * messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @since 1.0.0
 * @category constructors
 */
export const dropping: <A>(requestedCapacity: number) => Effect.Effect<never, never, Hub<A>> = internal.dropping

/**
 * Creates a bounded hub with the sliding strategy. The hub will add new
 * messages and drop old messages if the hub is at capacity.
 *
 * For best performance use capacities that are powers of two.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sliding: <A>(requestedCapacity: number) => Effect.Effect<never, never, Hub<A>> = internal.sliding

/**
 * Creates an unbounded hub.
 *
 * @since 1.0.0
 * @category constructors
 */
export const unbounded: <A>() => Effect.Effect<never, never, Hub<A>> = internal.unbounded

/**
 *  Returns the number of elements the queue can hold.
 *
 * @since 1.0.0
 * @category getters
 */
export const capacity: <A>(self: Hub<A>) => number = internal.capacity

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 *
 * @since 1.0.0
 * @category getters
 */
export const size: <A>(self: Hub<A>) => Effect.Effect<never, never, number> = internal.size

/**
 * Returns `true` if the `Queue` contains at least one element, `false`
 * otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isFull: <A>(self: Hub<A>) => Effect.Effect<never, never, boolean> = internal.isFull

/**
 * Returns `true` if the `Queue` contains zero elements, `false` otherwise.
 *
 * @since 1.0.0
 * @category getters
 */
export const isEmpty: <A>(self: Hub<A>) => Effect.Effect<never, never, boolean> = internal.isEmpty

/**
 * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
 * to `offer*` and `take*` will be interrupted immediately.
 *
 * @since 1.0.0
 * @category utils
 */
export const shutdown: <A>(self: Hub<A>) => Effect.Effect<never, never, void> = internal.shutdown

/**
 * Returns `true` if `shutdown` has been called, otherwise returns `false`.
 *
 * @since 1.0.0
 * @category getters
 */
export const isShutdown: <A>(self: Hub<A>) => Effect.Effect<never, never, boolean> = internal.isShutdown

/**
 * Waits until the queue is shutdown. The `Effect` returned by this method will
 * not resume until the queue has been shutdown. If the queue is already
 * shutdown, the `Effect` will resume right away.
 *
 * @since 1.0.0
 * @category utils
 */
export const awaitShutdown: <A>(self: Hub<A>) => Effect.Effect<never, never, void> = internal.awaitShutdown

/**
 * Publishes a message to the hub, returning whether the message was published
 * to the hub.
 *
 * @since 1.0.0
 * @category utils
 */
export const publish: {
  <A>(value: A): (self: Hub<A>) => Effect.Effect<never, never, boolean>
  <A>(self: Hub<A>, value: A): Effect.Effect<never, never, boolean>
} = internal.publish

/**
 * Publishes all of the specified messages to the hub, returning whether they
 * were published to the hub.
 *
 * @since 1.0.0
 * @category utils
 */
export const publishAll: {
  <A>(elements: Iterable<A>): (self: Hub<A>) => Effect.Effect<never, never, boolean>
  <A>(self: Hub<A>, elements: Iterable<A>): Effect.Effect<never, never, boolean>
} = internal.publishAll

/**
 * Subscribes to receive messages from the hub. The resulting subscription can
 * be evaluated multiple times within the scope to take a message from the hub
 * each time.
 *
 * @since 1.0.0
 * @category utils
 */
export const subscribe: <A>(self: Hub<A>) => Effect.Effect<Scope.Scope, never, Queue.Dequeue<A>> = internal.subscribe
