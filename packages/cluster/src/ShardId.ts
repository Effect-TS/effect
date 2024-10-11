/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"
import { TypeIdSchema } from "./internal/utils.js"

/** @internal */
const ShardIdSymbolKey = "@effect/cluster/ShardId"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ShardIdTypeId: unique symbol = Symbol.for(ShardIdSymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type ShardIdTypeId = typeof ShardIdTypeId

/** @internal */
const ShardIdTypeIdSchema = TypeIdSchema(ShardIdSymbolKey, ShardIdTypeId)

/**
 * A shard is a logical grouping of multiple entities. There could be thousands of entities in your system,
 * so instead of managing every single entity id, the shard manager group them by shard id, and when they are assigned
 * or moved around, we always move all the entities with the same shard id.
 *
 * @since 1.0.0
 * @category models
 */
export class ShardId extends Schema.Class<ShardId>(ShardIdSymbolKey)({
  [ShardIdTypeId]: Schema.propertySignature(ShardIdTypeIdSchema).pipe(Schema.fromKey(ShardIdSymbolKey)),
  value: Schema.Number
}) {
  /**
   * @since 1.0.0
   */
  toString() {
    return `ShardId(${this.value})`
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export namespace ShardId {
  /**
   * This is the shape that a shard id has over the wire.
   *
   * @since 1.0.0
   * @category models
   */
  export interface Encoded extends Schema.Schema.Encoded<typeof ShardId> {}
}

/**
 * Constructs a shard id from its numerical value.
 * The shard id is currently built up by making the hash of the entity id, and then modulo the max amount of shards configured in ManagerConfig.
 *
 * @since 1.0.0
 * @category constructors
 */
export function make(value: number): ShardId {
  return new ShardId({ [ShardIdTypeId]: ShardIdTypeId, value })
}

/**
 * This is the schema for a ShardId.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema: Schema.Schema<
  ShardId,
  ShardId.Encoded
> = Schema.asSchema(ShardId)
