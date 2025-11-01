/**
 * @since 1.0.0
 */
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Schema from "effect/Schema"
import { EntityId } from "./EntityId.js"
import { EntityType } from "./EntityType.js"
import { ShardId } from "./ShardId.js"

const SymbolKey = "@effect/cluster/EntityAddress"

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
 * Represents the unique address of an entity within the cluster.
 *
 * @since 1.0.0
 * @category models
 */
export class EntityAddress extends Schema.Class<EntityAddress>(SymbolKey)({
  shardId: ShardId,
  entityType: EntityType,
  entityId: EntityId
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId;

  /**
   * @since 1.0.0
   */
  [Equal.symbol](that: EntityAddress): boolean {
    return this.entityType === that.entityType && this.entityId === that.entityId &&
      this.shardId[Equal.symbol](that.shardId)
  }

  /**
   * @since 1.0.0
   */
  [Hash.symbol]() {
    return Hash.cached(this, Hash.string(`${this.entityType}:${this.entityId}:${this.shardId.toString()}`))
  }
}

/**
 * Represents the unique address of an entity within the cluster.
 *
 * @since 1.0.0
 * @category schemas
 */
export const EntityAddressFromSelf: Schema.Schema<EntityAddress> = Schema.typeSchema(
  EntityAddress
)

/**
 * @since 4.0.0
 * @category constructors
 */
export const make = (options: {
  readonly shardId: ShardId
  readonly entityType: EntityType
  readonly entityId: EntityId
}): EntityAddress => new EntityAddress(options, { disableValidation: true })
