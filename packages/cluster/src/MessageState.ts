/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Exit from "effect/Exit"
import type * as Message from "./Message.js"
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
export interface MessageStateProcessed<A, E> {
  readonly [MessageStateTypeId]: MessageStateTypeId
  readonly _tag: "@effect/cluster/MessageState/Processed"
  readonly result: Exit.Exit<A, E>
}

/**
 * Once a Message is sent to an entity to be processed,
 * the state of that message over that entity is either Acknoledged (not yet processed) or Processed.
 *
 * @since 1.0.0
 * @category models
 */
export type MessageState<A, E> = MessageStateAcknowledged | MessageStateProcessed<A, E>

/**
 * @since 1.0.0
 * @category models
 */
export namespace MessageState {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Encoded<IA, IE> = {
    readonly "@effect/cluster/MessageState": "@effect/cluster/MessageState"
    readonly _tag: "@effect/cluster/MessageState/Acknowledged"
  } | {
    readonly result: Schema.ExitEncoded<IA, IE>
    readonly "@effect/cluster/MessageState": "@effect/cluster/MessageState"
    readonly _tag: "@effect/cluster/MessageState/Processed"
  }
    /**
   * @since 1.0.0
   * @category models
   */
    export type FromMessage<A extends Message.Message.Any> = MessageState<Message.Message.Success<A>, Message.Message.Error<A>>
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
export const Processed: <A, E>(result: Exit.Exit<A, E>) => MessageStateProcessed<A, E> = internal.Processed

/**
 * @since 1.0.0
 * @category schema
 */
export const schema: <A, IA, E, IE>(
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>
) => Schema.Schema<
  MessageState<A, E>,
  MessageState.Encoded<IA, IE>
> = internal.schema
