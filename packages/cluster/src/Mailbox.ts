/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import type { Cause } from "effect/Cause"
import type { Effect } from "effect/Effect"
import type { Exit } from "effect/Exit"
import type { Queue } from "effect/Queue"
import type { EntityId } from "./EntityId.js"
import type { EntityType } from "./EntityType.js"
import type { Envelope } from "./Envelope.js"
import type { ShardId } from "./ShardId.js"

/**
 * Represents the `Mailbox` of an `Entity` where messages are enqueued while
 * waiting to be processed.
 *
 * The readonly side of a `Mailbox` (i.e. a `Mailbox` that cannot be enqueued
 * into) is used by an entity's behavior to dequeue messages for processing.
 * Once a message has been dequeued by a behavior, the `ReadonlyMailbox` can
 * also be used to acknowledge that the entity has received the message as well
 * as to reply to the message with a result.
 *
 * @since 1.0.0 @category models
 */
export interface Mailbox<Msg extends Envelope.AnyMessage> extends Queue<Mailbox.Entry<Msg>> {
  /**
   * Acknowledges that an entity has successfully received the specified
   * message.
   */
  readonly acknowledge: (message: Msg) => Effect<void>
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

/**
 * @since 1.0.0
 */
export declare namespace Mailbox {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Entry<Msg extends Envelope.AnyMessage> {
    readonly shardId: ShardId
    readonly entityId: EntityId
    readonly entityType: EntityType
    readonly message: Msg
    readonly sequenceNumber: number
  }
}
