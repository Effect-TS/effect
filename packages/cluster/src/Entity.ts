/**
 * @since 1.0.0
 */
import type { Cause } from "effect/Cause"
import type { Effect } from "effect/Effect"
import * as Equal from "effect/Equal"
import type { Exit } from "effect/Exit"
import * as Hash from "effect/Hash"
import type { ReadonlyMailbox } from "effect/Mailbox"
import * as Predicate from "effect/Predicate"
import type { Serializable, WithResult } from "effect/Schema"
import * as Schema from "effect/Schema"
import { EntityType } from "./EntityType.js"
import type { Envelope } from "./Envelope.js"
import type { MailboxStorage } from "./MailboxStorage.js"

const SymbolKey = "@effect/cluster/Entity"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(SymbolKey)

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Entity<Msg extends Envelope.AnyMessage> extends Equal.Equal, Entity.Proto {
  /**
   * The name of the entity type.
   */
  readonly type: EntityType
  /**
   * A schema definition for messages which represents the messaging protocol
   * that the entity is capable of processing.
   */
  readonly protocol: Schema.Schema<
    Msg,
    Serializable.Encoded<Msg>,
    Serializable.Context<Msg>
  >
}

/**
 * @since 1.0.0
 */
export declare namespace Entity {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type GetBehavior<E extends Entity<any>> = E extends Entity<infer _Msg> ? Behavior<_Msg> : never

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Behavior<Msg extends Envelope.AnyMessage> {
    (
      mailbox: ReadonlyMailbox<MailboxStorage.Entry<Msg>>,
      replier: Replier
    ): Effect<void>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Replier {
    /**
     * Completes specified message with the provided value.
     */
    readonly succeed: <Msg extends Envelope.AnyMessage>(
      message: Msg,
      value: WithResult.Success<Msg>
    ) => Effect<void>
    /**
     * Completes specified message with the provided error.
     */
    readonly fail: <Msg extends Envelope.AnyMessage>(
      message: Msg,
      error: WithResult.Failure<Msg>
    ) => Effect<void>
    /**
     * Completes specified message with the provided `Cause`.
     */
    readonly failCause: <Msg extends Envelope.AnyMessage>(
      message: Msg,
      cause: Cause<WithResult.Failure<Msg>>
    ) => Effect<void>
    /**
     * Completes specified message with the provided `Exit`.
     */
    readonly done: <Msg extends Envelope.AnyMessage>(
      message: Msg,
      result: Exit<WithResult.Success<Msg>, WithResult.Failure<Msg>>
    ) => Effect<void>
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEntity = (u: unknown): u is Entity<
  Envelope.AnyMessage
> => Predicate.hasProperty(u, TypeId)

const Proto = {
  [TypeId]: TypeId,
  [Hash.symbol](this: Entity<any>): number {
    return Hash.structure({ type: this.type })
  },
  [Equal.symbol](this: Entity<any>, that: Equal.Equal): boolean {
    return isEntity(that) && this.type === that.type
  }
}

/**
 * Creates a new `Entity` of the specified `type` which will accept messages
 * that adhere to the provided `schema`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <const MessageTypes extends ReadonlyArray<Envelope.AnyMessageSchema>>(
  /**
   * The entity type name.
   */
  type: string,
  /**
   * The schema definition for messages that the entity is capable of
   * processing.
   */
  protocol: MessageTypes
): Entity<MessageTypes[number]["Type"]> =>
  Object.assign(Object.create(Proto), {
    type: EntityType.make(type),
    schema: Schema.Union(...protocol as any)
  })
