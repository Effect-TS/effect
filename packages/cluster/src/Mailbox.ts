/**
 * @since 1.0.0
 */
import type * as Serializable from "@effect/schema/Serializable"
import type { Cause } from "effect/Cause"
import type { Chunk } from "effect/Chunk"
import type { Effect } from "effect/Effect"
import type { Exit } from "effect/Exit"
import type { Envelope } from "./Envelope.js"

/**
 * Represents the `Mailbox` of an `Entity` where messages are enqueued while
 * waiting to be processed.
 *
 * The read side of the `Mailbox` is used by the entity's behavior to dequeue
 * messages for processing. Once a message has been dequeued by a behavior, the
 * `Mailbox` can also be used to acknowledge that the entity has received the
 * message as well as to reply to the message with a result.
 *
 * @since 1.0.0
 * @category models
 */
export interface Mailbox<Msg extends Envelope.AnyMessage>
  extends Mailbox.Dequeue<Msg>, Mailbox.Acknowledgement<Msg>, Mailbox.Completion<Msg>
{}

/**
 * @since 1.0.0
 */
export declare namespace Mailbox {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Dequeue<Msg extends Envelope.AnyMessage> {
    /**
     * Takes a single message from the mailbox.
     */
    readonly take: Effect<Msg>
    /**
     * Takes all messages from the mailbox.
     */
    readonly takeAll: Effect<Chunk<Msg>>
    /**
     * Takes between the specified `min` and `max` number of messages from the
     * mailbox.
     */
    readonly takeBetween: (min: number, max: number) => Effect<Chunk<Msg>>
    /**
     * Takes up to the specified `max` number of messages from the mailbox.
     */
    readonly takeUpTo: (max: number) => Effect<Chunk<Msg>>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Acknowledgement<Msg extends Envelope.AnyMessage> {
    /**
     * Acknowledges that an entity has successfully received the specified
     * message.
     */
    readonly acknowledge: (message: Msg) => Effect<void>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Completion<Msg extends Envelope.AnyMessage> {
    /**
     * Completes specified message with the provided value.
     */
    readonly succeed: (
      message: Msg,
      value: Serializable.WithResult.Success<Msg>
    ) => Effect<void>
    /**
     * Completes specified message with the provided error.
     */
    readonly fail: (
      message: Msg,
      value: Serializable.WithResult.Failure<Msg>
    ) => Effect<void>
    /**
     * Completes specified message with the provided `Cause`.
     */
    readonly failCause: (
      message: Msg,
      value: Cause<Serializable.WithResult.Failure<Msg>>
    ) => Effect<void>
    /**
     * Completes specified message with the provided `Exit`.
     */
    readonly complete: (
      message: Msg,
      result: Exit<
        Serializable.WithResult.Success<Msg>,
        Serializable.WithResult.Failure<Msg>
      >
    ) => Effect<void>
    /**
     * Completes specified message with the provided `Exit`.
     */
    readonly completeEffect: <R>(
      message: Msg,
      effect: Effect<
        Serializable.WithResult.Success<Msg>,
        Serializable.WithResult.Failure<Msg>,
        R
      >
    ) => Effect<void, never, Serializable.WithResult.Context<Msg> | R>
  }
}
