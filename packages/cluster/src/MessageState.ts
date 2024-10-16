/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as Schema from "effect/Schema"
import * as internal from "./internal/messageState.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MessageStateTypeId: unique symbol = internal.MessageStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MessageStateTypeId = typeof MessageStateTypeId

/**
 * A message state given to just acknowledged messages.
 * This state tells the sender that the receiver has received the message and will eventually process it later.
 *
 * @since 1.0.0
 * @category models
 */
export interface MessageStateAcknowledged {
  readonly [MessageStateTypeId]: MessageStateTypeId
  readonly _tag: "@effect/cluster/MessageState/Acknowledged"
}

/**
 * A message state given to processed messages.
 * This state tells the sender that the receiver has already received and processed the message.
 * This will also tell the sender the result for this message.
 *
 * @since 1.0.0
 * @category models
 */
export interface MessageStateProcessed<A> {
  readonly [MessageStateTypeId]: MessageStateTypeId
  readonly _tag: "@effect/cluster/MessageState/Processed"
  readonly result: A
}

/**
 * Once a Message is sent to an entity to be processed,
 * the state of that message over that entity is either Acknoledged (not yet processed) or Processed.
 *
 * @since 1.0.0
 * @category models
 */
export type MessageState<A> = MessageStateAcknowledged | MessageStateProcessed<A>

/**
 * @since 1.0.0
 * @category models
 */
export namespace MessageState {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Encoded<I> = {
    readonly "@effect/cluster/MessageState": "@effect/cluster/MessageState"
    readonly _tag: "@effect/cluster/MessageState/Acknowledged"
  } | {
    readonly result: I
    readonly "@effect/cluster/MessageState": "@effect/cluster/MessageState"
    readonly _tag: "@effect/cluster/MessageState/Processed"
  }
}

/**
 * Ensures that the given value is a MessageState
 *
 * @since 1.0.0
 * @category utils
 */
export const isMessageState = internal.isMessageState

/**
 * Match over the possible states of a MessageState
 *
 * @since 1.0.0
 * @category utils
 */
export const match = internal.match

/**
 * Constructs an AcknowledgedMessageState.
 *
 * @since 1.0.0
 * @category constructors
 */
export const Acknowledged: MessageStateAcknowledged = internal.Acknowledged

/**
 * Constructs a ProcessedMessageState from the result of the message being processed.
 *
 * @since 1.0.0
 * @category constructors
 */
export const Processed: <A>(result: A) => MessageStateProcessed<A> = internal.Processed

/**
 * Effectfully transform the <A> type of the MessageState<A>.
 *
 * @since 1.0.0
 * @category utils
 */
export const mapEffect: <A, B, R, E>(
  value: MessageState<A>,
  fn: (value: A) => Effect.Effect<B, E, R>
) => Effect.Effect<MessageState<B>, E, R> = internal.mapEffect

/**
 * @since 1.0.0
 * @category schema
 */
export const schema: <A, I>(
  result: Schema.Schema<A, I>
) => Schema.Schema<
  MessageState<A>,
  MessageState.Encoded<I>
> = internal.schema
