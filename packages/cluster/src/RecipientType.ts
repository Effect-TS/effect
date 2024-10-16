/**
 * @since 1.0.0
 */
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import type * as Schema from "effect/Schema"
import type * as Message from "./Message.js"
import * as ShardId from "./ShardId.js"

const RecipientTypeSymbolKey = "@effect/cluster/RecipientType"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RecipientTypeTypeId: unique symbol = Symbol.for(RecipientTypeSymbolKey)

/**
 * An EntityType is a RecipientType that is ensured to be alive only on a single Pod at a time.
 *
 * @since 1.0.0
 * @category models
 */
export class EntityType<Msg extends Message.Message.Any> extends Data.TaggedClass("EntityType")<{
  readonly name: string
  readonly schema: Schema.Schema<Msg, unknown>
}> {
  /**
   * @since 1.0.0
   */
  readonly [RecipientTypeTypeId] = RecipientTypeTypeId;

  /**
   * @since 1.0.0
   */
  [Hash.symbol](): number {
    return Hash.structure({ _tag: this._tag, name: this.name })
  }

  /**
   * @since 1.0.0
   */
  [Equal.symbol](this: TopicType<Msg>, that: Equal.Equal): boolean {
    if (isRecipientType(that)) {
      return this._tag === that._tag && this.name === that.name
    }
    return false
  }
}

/**
 * A TopicType can live on multiple Pods at the same time.
 *
 * @since 1.0.0
 * @category models
 */
export class TopicType<Msg extends Message.Message.Any> extends Data.TaggedClass("TopicType")<{
  readonly name: string
  readonly schema: Schema.Schema<Msg, unknown>
}> {
  /**
   * @since 1.0.0
   */
  readonly [RecipientTypeTypeId] = RecipientTypeTypeId;

  /**
   * @since 1.0.0
   */
  [Hash.symbol](): number {
    return Hash.structure({ _tag: this._tag, name: this.name })
  }

  /**
   * @since 1.0.0
   */
  [Equal.symbol](this: EntityType<Msg>, that: Equal.Equal): boolean {
    if (isRecipientType(that)) {
      return this._tag === that._tag && this.name === that.name
    }
    return false
  }
}

/**
 * A RecipientType is basically a pointer to a logical grouping of multiple enties having the same RecipientBehaviour.
 * This value is required to be able to message with an entity/topic since it holds the Schema for the messages over the wire.
 * Without the schema, you cannot ensure that the messages sent are what the receiver expects.
 * Ideally, you can share this definition between the caller and the receiver.
 *
 * @since 1.0.0
 * @category models
 */
export type RecipientType<Msg extends Message.Message.Any> = EntityType<Msg> | TopicType<Msg>

/**
 * Ensure that given value is a RecipientType
 * @since 1.0.0
 * @category constructors
 */
export function isRecipientType<A extends Message.Message.Any>(value: unknown): value is RecipientType<A> {
  return typeof value === "object" && value !== null && RecipientTypeTypeId in value &&
    value[RecipientTypeTypeId] === RecipientTypeTypeId
}

/**
 * Given a name and a schema for the protocol, constructs an EntityType.
 *
 * @since 1.0.0
 * @category constructors
 */
export function makeEntityType<Msg extends Message.Message.Any, I>(
  name: string,
  schema: Schema.Schema<Msg, I>
): EntityType<Msg> {
  return new EntityType({ name, schema: schema as any })
}

/**
 * Given a name and a schema for the protocol, constructs an TopicType.
 *
 * @since 1.0.0
 * @category constructors
 */
export function makeTopicType<Msg extends Message.Message.Any, I>(
  name: string,
  schema: Schema.Schema<Msg, I>
): TopicType<Msg> {
  return new TopicType({ name, schema: schema as any })
}

/** @internal */
export const getShardId = (entityId: string, numberOfShards: number): ShardId.ShardId =>
  ShardId.make(Math.abs(Hash.string(entityId) % numberOfShards) + 1)
