/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import type * as RpcGroup from "@effect/rpc/RpcGroup"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import type { Scope } from "effect/Scope"
import { EntityType } from "./EntityType.js"
import type { Pods } from "./Pods.js"
import * as Sharding from "./Sharding.js"
import type { ShardingConfig } from "./ShardingConfig.js"
import type { ShardManagerClient } from "./ShardManager.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Entity")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Entity<out Rpc extends Rpc.Any> extends Equal.Equal {
  readonly [TypeId]: TypeId
  /**
   * The name of the entity type.
   */
  readonly type: EntityType
  /**
   * A RpcGroup definition for messages which represents the messaging protocol
   * that the entity is capable of processing.
   */
  readonly protocol: RpcGroup.RpcGroup<Rpc>
}

/**
 * @since 1.0.0
 */
export declare namespace Entity {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = Entity<Rpc.Any>
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEntity = (u: unknown): u is Entity.Any => Predicate.hasProperty(u, TypeId)

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
 * that adhere to the provided `RpcGroup`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <Rpcs extends Rpc.Any>(
  /**
   * The entity type name.
   */
  type: string,
  /**
   * The schema definition for messages that the entity is capable of
   * processing.
   */
  protocol: RpcGroup.RpcGroup<Rpcs>
): Entity<Rpcs> => {
  const self = Object.create(Proto)
  self.type = EntityType.make(type)
  self.protocol = protocol
  return self
}

/**
 * Create a Layer from an Entity.
 *
 * It will register the entity with the Sharding service.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer = <
  Rpcs extends Rpc.Any,
  Handlers extends RpcGroup.HandlersFrom<Rpcs>,
  EX = never,
  RX = never
>(
  entity: Entity<Rpcs>,
  build:
    | Handlers
    | Effect.Effect<Handlers, EX, RX>
): Layer.Layer<
  never,
  EX,
  | Exclude<RX, Scope>
  | RpcGroup.HandlersContext<Rpcs, Handlers>
  | Pods
  | ShardingConfig
  | ShardManagerClient
> =>
  Layer.effectDiscard(Effect.flatMap(Sharding.Sharding, (sharding) => sharding.registerEntity(entity))).pipe(
    Layer.provide([
      Sharding.layer,
      entity.protocol.toLayer(build)
    ])
  )
