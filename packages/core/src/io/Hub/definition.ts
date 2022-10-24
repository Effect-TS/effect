export const HubSym = Symbol.for("@effect/core/io/XHub")
export type HubSym = typeof HubSym

/**
 * A `Hub<A>` is an asynchronous message hub into which publishers can publish
 * messages of type `A` and subscribers can subscribe to take messages of type
 * `A`.
 *
 * @tsplus type effect/core/io/Hub
 * @category model
 * @since 1.0.0
 */
export interface Hub<A> extends Enqueue<A> {
  get [HubSym](): HubSym

  /**
   * Publishes a message to the hub, returning whether the message was published
   * to the hub.
   */
  publish(this: this, a: A): Effect<never, never, boolean>

  /**
   * Publishes all of the specified messages to the hub, returning whether they
   * were published to the hub.
   */
  publishAll(this: this, as: Iterable<A>): Effect<never, never, boolean>

  /**
   * Subscribes to receive messages from the hub. The resulting subscription can
   * be evaluated multiple times within the scope to take a message from the hub
   * each time.
   */
  get subscribe(): Effect<Scope, never, Dequeue<A>>
}

/**
 * @tsplus type effect/core/io/Hub.Ops
 * @category model
 * @since 1.0.0
 */
export interface HubOps {
  $: HubAspects
}
export const Hub: HubOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Hub.Aspects
 * @category model
 * @since 1.0.0
 */
export interface HubAspects {}
