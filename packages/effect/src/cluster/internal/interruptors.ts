/**
 * @unstable
 */
import * as Effect from "../../Effect.ts"
import type { EntityAddress } from "../EntityAddress.ts"
import type { ShardId } from "../ShardId.ts"

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

const entityKey = (address: EntityAddress): string =>
  `entity:${address.entityType}:${address.entityId}:${address.shardId.toString()}`

const shardKey = (shardId: ShardId): string => `shard:${shardId.toString()}`

const entityTypeKey = (entityType: string): string => `type:${entityType}`

/**
 * @internal
 * @unstable
 */
export const acquireEntity = (address: EntityAddress): void => acquire(entityKey(address))

/**
 * @internal
 * @unstable
 */
export const releaseEntity = (address: EntityAddress): void => release(entityKey(address))

/**
 * @internal
 * @unstable
 */
export const acquireEntityType = (entityType: string): void => acquire(entityTypeKey(entityType))

/**
 * @internal
 * @unstable
 */
export const releaseEntityType = (entityType: string): void => release(entityTypeKey(entityType))

/**
 * @internal
 * @unstable
 */
export const aroundShard = <A, E, R>(
  shardId: ShardId,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => around(shardKey(shardId), effect)

/**
 * @internal
 * @unstable
 */
export const aroundEntityType = <A, E, R>(
  entityType: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => around(entityTypeKey(entityType), effect)

/**
 * @internal
 * @unstable
 */
export const isActive = (address: EntityAddress): boolean =>
  counts.has(entityKey(address)) ||
  counts.has(shardKey(address.shardId)) ||
  counts.has(entityTypeKey(address.entityType))
