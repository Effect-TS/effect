import type { Entity } from "../Entity.js"
import type * as ShardingRegistrationEvent from "../ShardingRegistrationEvent.js"

/** @internal */
export const EntityRegistered = (
  entity: Entity<any>
): ShardingRegistrationEvent.ShardingRegistrationEvent => ({
  _tag: "EntityRegistered",
  entity
})

/** @internal */
export const SingletonRegistered = (
  name: string
): ShardingRegistrationEvent.ShardingRegistrationEvent => ({
  _tag: "SingletonRegistered",
  name
})
