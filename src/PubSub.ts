/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { Pipeable } from "./Pipeable.js"
import type { Queue } from "./Queue.js"
import type { Scope } from "./Scope.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/PubSub.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/PubSub.js"

/**
 * @since 2.0.0
 */
export declare namespace PubSub {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/PubSub.js"
}
/**
 * A `PubSub<A>` is an asynchronous message hub into which publishers can publish
 * messages of type `A` and subscribers can subscribe to take messages of type
 * `A`.
 *
 * @since 2.0.0
 * @category models
 */
export interface PubSub<A> extends Queue.Enqueue<A>, Pipeable {
  /**
   * Publishes a message to the `PubSub`, returning whether the message was published
   * to the `PubSub`.
   */
  publish(value: A): Effect<never, never, boolean>

  /**
   * Publishes all of the specified messages to the `PubSub`, returning whether they
   * were published to the `PubSub`.
   */
  publishAll(elements: Iterable<A>): Effect<never, never, boolean>

  /**
   * Subscribes to receive messages from the `PubSub`. The resulting subscription can
   * be evaluated multiple times within the scope to take a message from the `PubSub`
   * each time.
   */
  subscribe(): Effect<Scope, never, Queue.Dequeue<A>>
}
