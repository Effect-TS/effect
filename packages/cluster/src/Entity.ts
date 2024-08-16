/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Predicate from "effect/Predicate"

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
export type Entity<Msg extends Schema.TaggedRequest.Any> = Standard<Msg> | Clustered<Msg>

/**
 * @since 1.0.0
 */
export declare namespace Entity {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface CommonProps<Msg extends Schema.TaggedRequest.Any> {
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
    /**
     * A function used to determine the message identifier for a given message.
     */
    readonly getMessageId: (message: Msg) => string
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEntity = (u: unknown): u is Entity<
  Schema.TaggedRequest.Any
> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category refinements
 */
export const isStandard = <Msg extends Schema.TaggedRequest.Any>(
  entity: Entity<Msg>
): entity is Standard<Msg> => Predicate.isTagged(entity, "Standard")

/**
 * @since 1.0.0
 * @category refinements
 */
export const isClustered = <Msg extends Schema.TaggedRequest.Any>(
  entity: Entity<Msg>
): entity is Clustered<Msg> => Predicate.isTagged(entity, "Clustered")

/**
 * A `Standard` entity represents an entity that may only be alive on a single
 * pod at a time.
 *
 * @since 1.0.0
 * @category models
 */
export class Standard<Msg extends Schema.TaggedRequest.Any> extends Data.TaggedClass("Standard")<
  Entity.CommonProps<Msg>
> {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId;

  /**
   * @since 1.0.0
   */
  [Hash.symbol](): number {
    return Hash.structure({ _tag: this._tag, type: this.type })
  }

  /**
   * @since 1.0.0
   */
  [Equal.symbol](this: Standard<Msg>, that: Equal.Equal): boolean {
    return isEntity(that) && isStandard(that) && this.type === that.type
  }
}

/**
 * A `Clustered` entity represents an entity that may be alive on multiple pods
 * at a time.
 *
 * @since 1.0.0
 * @category models
 */
export class Clustered<Msg extends Schema.TaggedRequest.Any> extends Data.TaggedClass("Clustered")<
  Entity.CommonProps<Msg>
> {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId;

  /**
   * @since 1.0.0
   */
  [Hash.symbol](): number {
    return Hash.structure({ _tag: this._tag, type: this.type })
  }

  /**
   * @since 1.0.0
   */
  [Equal.symbol](this: Standard<Msg>, that: Equal.Equal): boolean {
    return isEntity(that) && isClustered(that) && this.type === that.type
  }
}
