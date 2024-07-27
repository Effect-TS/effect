/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
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
    readonly result: Schema.ExitEncoded<IA, IE, unknown>
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
export const Processed: <A, E>(result: Exit.Exit<A, E>) => MessageStateProcessed<A, E> = internal.Processed

/**
 * Effectfully transform the Exit<A, E> type of the MessageState<A, E>.
 *
 * @since 1.0.0
 * @category utils
 */
export const mapBothEffect: <A, E, B, E1, R1, D, E2, R2, E3, R3>(
  value: MessageState<A, E>,
  onSuccess: (value: A) => Effect.Effect<B, E1, R1>,
  onFailure: (value: E) => Effect.Effect<D, E2, R2>,
  onDefect: (value: unknown) => Effect.Effect<unknown, E3, R3>
) => Effect.Effect<MessageState<B, D>, E1 | E2 | E3, R1 | R2 | R3> = internal.mapBothEffect

/**
 * @since 1.0.0
 * @category schema
 */
export const schema: <A, IA, RA, E, IE, RE, RD>(
  success: Schema.Schema<A, IA, RA>,
  failure: Schema.Schema<E, IE, RE>,
  defect: Schema.Schema<unknown, unknown, RD>
) => Schema.Schema<MessageState<A, E>, MessageState.Encoded<IA, IE>, RA | RE | RD> = internal.schema
