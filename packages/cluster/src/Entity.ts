/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Predicate from "effect/Predicate"
import { EntityType } from "./EntityType.js"
import type { Envelope } from "./Envelope.js"

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
export interface Entity<Msg extends Schema.TaggedRequest.Any> extends Equal.Equal, Entity.Proto {
  /**
   * The entity type name.
   */
  readonly type: EntityType
  /**
   * The schema definition for messages that the entity is capable of
   * processing.
   */
  readonly schema: Schema.Schema<
    Msg,
    Serializable.Serializable.Encoded<Msg>,
    Serializable.Serializable.Context<Msg>
  >
  /**
   * A function used to determine the message identifier for a given message.
   */
  readonly getMessageId: (message: Msg) => string
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
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEntity = (u: unknown): u is Entity<
  Schema.TaggedRequest.Any
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
 * @since 1.0.0
 * @category constructors
 */
export const make = <Msg extends Envelope.AnyMessage>(props: {
  /**
   * The entity type name.
   */
  readonly type: string
  /**
   * The schema definition for messages that the entity is capable of
   * processing.
   */
  readonly schema: Schema.Schema<
    Msg,
    Serializable.Serializable.Encoded<Msg>,
    Serializable.Serializable.Context<Msg>
  >
}): Entity<Msg> =>
  Object.assign(Object.create(Proto), {
    type: EntityType.make(props.type),
    schema: props.schema
  })
