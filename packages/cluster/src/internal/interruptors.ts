import * as Effect from "effect/Effect"
import type { EntityAddress } from "../EntityAddress.js"
import type { ShardId } from "../ShardId.js"

/** @internal */
export type ActiveTeardown = ReturnType<typeof make>

/** @internal */
export const make = () => {
  const counts = new Map<string, number>()

  const acquire = (key: string) => {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const release = (key: string) => {
    const n = counts.get(key)
    if (n === undefined) return
    if (n <= 1) counts.delete(key)
    else counts.set(key, n - 1)
  }

  const around = <A, E, R>(key: string, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.suspend(() => {
      acquire(key)
      return Effect.ensuring(effect, Effect.sync(() => release(key)))
    })

  return {
    acquireEntity: (address: EntityAddress): void => acquire(entityKey(address)),
    releaseEntity: (address: EntityAddress): void => release(entityKey(address)),
    acquireEntityType: (entityType: string): void => acquire(entityTypeKey(entityType)),
    releaseEntityType: (entityType: string): void => release(entityTypeKey(entityType)),
    aroundShard: <A, E, R>(shardId: ShardId, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      around(shardKey(shardId), effect),
    aroundEntityType: <A, E, R>(entityType: string, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      around(entityTypeKey(entityType), effect),
    isActive: (address: EntityAddress): boolean =>
      counts.has(entityKey(address)) ||
      counts.has(shardKey(address.shardId)) ||
      counts.has(entityTypeKey(address.entityType))
  }
}

const entityKey = (address: EntityAddress): string =>
  `entity:${address.entityType}:${address.entityId}:${address.shardId.toString()}`

const shardKey = (shardId: ShardId): string => `shard:${shardId.toString()}`

const entityTypeKey = (entityType: string): string => `type:${entityType}`

// Standalone helpers retain an isolated tracker; Sharding instances use make().
/** @internal */
export const {
  acquireEntity,
  acquireEntityType,
  aroundEntityType,
  aroundShard,
  isActive,
  releaseEntity,
  releaseEntityType
} = make()
