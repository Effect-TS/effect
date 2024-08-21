/**
 * @since 1.0.0
 */
import type { Entity } from "./Entity.js"

/**
 * Represents events that can occur when a pod registers entities or singletons.
 *
 * @since 1.0.0
 * @category models
 */
export type ShardingRegistrationEvent =
  | EntityRegistered
  | SingletonRegistered

/**
 * Represents an event that occurs when a new entity is registered with a pod.
 *
 * @since 1.0.0
 * @category models
 */
export interface EntityRegistered {
  readonly _tag: "EntityRegistered"
  readonly entity: Entity<any>
}

/**
 * Represents an event that occurs when a new singleton is registered with a
 * pod.
 *
 * @since 1.0.0
 * @category models
 */
export interface SingletonRegistered {
  readonly _tag: "SingletonRegistered"
  readonly name: string
}
