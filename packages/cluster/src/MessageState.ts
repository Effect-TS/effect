/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type { Exit } from "effect/Exit"
import type { LazyArg } from "effect/Function"
import type * as Schema from "effect/Schema"
import type { Covariant } from "effect/Types"
import * as internal from "./internal/messageState.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * Represents the state of a message after it has been delivered to an entity
 * for processing.
 *
 * A message can either be in an `Acknowledged` state, indicating that the
 * message was successfully recieved by the entity but has not yet been
 * processed, or in a `Processed` state, indicating that the message has been
 * processed by the entity and a result is availabe.
 *
 * @since 1.0.0
 * @category models
 */
export type MessageState<A, E> = Acknowledged | Processed<A, E>

/**
 * Represents the state of a message after being acknowledged by an entity.
 *
 * This message state indicates that an entity has received the message
 * successfully and will eventually process the message at some later time.
 *
 * @since 1.0.0
 * @category models
 */
export interface Acknowledged extends MessageState.Proto<never, never> {
  readonly _tag: "Acknowledged"
}

/**
 * Represents the state of a message after being processed by an entity.
 *
 * This message state indicates that an entity has received **and processed**
 * the message and provides access to the result of processing the message.
 *
 * @since 1.0.0
 * @category models
 */
export interface Processed<A, E> extends MessageState.Proto<A, E> {
  readonly _tag: "Processed"
  readonly result: Exit<A, E>
}

/**
 * @since 1.0.0
 */
export declare namespace MessageState {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<out A, out E> {
    readonly [TypeId]: VarianceStruct<A, E>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface VarianceStruct<out A, out E> {
    readonly _A: Covariant<A>
    readonly _E: Covariant<E>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Encoded<IA, IE> = AcknowledgedEncoded | ProcessedEncoded<IA, IE>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface AcknowledgedEncoded {
    readonly _tag: "@effect/cluster/MessageState/Acknowledged"
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ProcessedEncoded<IA, IE> {
    readonly _tag: "@effect/cluster/MessageState/Processed"
    readonly result: Schema.ExitEncoded<IA, IE, unknown>
  }
}

/**
 * Returns `true` if the specified unknown value is a `MessageState`, otherwise
 * returns `false`.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isMessageState: (u: unknown) => u is MessageState<unknown, unknown> = internal.isMessageState

/**
 * Returns `true` if the specified `MessageState` is `Acknowledged`, otherwise
 * returns `false`.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isAcknowledged: <A, E>(self: MessageState<A, E>) => self is Acknowledged = internal.isAcknowledged

/**
 * Returns `true` if the specified `MessageState` is `Processed`, otherwise
 * returns `false`.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isProcessed: <A, E>(self: MessageState<A, E>) => self is Processed<A, E> = internal.isProcessed

/**
 * Constructs an `Acknowledged` message state.
 *
 * @since 1.0.0
 * @category constructors
 */
export const acknowledged: MessageState<never, never> = internal.acknowledged

/**
 * Constructs a `Processed` message state from the result of processing a
 * message.
 *
 * @since 1.0.0
 * @category constructors
 */
export const processed: <A, E>(result: Exit<A, E>) => MessageState<A, E> = internal.processed

/**
 * Match over the possible states of a `MessageState`.
 *
 * @since 1.0.0
 * @category pattern matching
 */
export const match: {
  <A, E, B, C = B>(
    options: {
      onAcknowledged: LazyArg<B>
      onProcessed: (exit: Exit<A, E>) => C
    }
  ): (self: MessageState<A, E>) => B | C
  <A, E, B, C = B>(
    self: MessageState<A, E>,
    options: {
      onAcknowledged: LazyArg<B>
      onProcessed: (exit: Exit<A, E>) => C
    }
  ): B | C
} = internal.match

/**
 * Map over the result contained with the `Processed` message state, if any,
 * and apply the specified functions to the result.
 *
 * @since 1.0.0
 * @category utils
 */
export const mapBothEffect: {
  <A, E, B, E1, R1, C, E2, R2, E3, R3>(
    options: {
      onSuccess: (value: A) => Effect.Effect<B, E1, R1>
      onFailure: (error: E) => Effect.Effect<C, E2, R2>
    }
  ): (
    self: MessageState<A, E>
  ) => Effect.Effect<MessageState<B, C>, E1 | E2 | E3, R1 | R2 | R3>
  <A, E, B, E1, R1, C, E2, R2, E3, R3>(
    self: MessageState<A, E>,
    options: {
      onSuccess: (value: A) => Effect.Effect<B, E1, R1>
      onFailure: (error: E) => Effect.Effect<C, E2, R2>
    }
  ): Effect.Effect<MessageState<B, C>, E1 | E2 | E3, R1 | R2 | R3>
} = internal.mapBothEffect

/**
 * @since 1.0.0
 * @category schema
 */
export const schema: <A, IA, RA, E, IE, RE, RD>(
  success: Schema.Schema<A, IA, RA>,
  failure: Schema.Schema<E, IE, RE>,
  defect: Schema.Schema<unknown, unknown, RD>
) => Schema.Schema<
  MessageState<A, E>,
  MessageState.Encoded<IA, IE>,
  RA | RE | RD
> = internal.schema
