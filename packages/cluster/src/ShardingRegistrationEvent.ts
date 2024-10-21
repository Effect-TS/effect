/**
 * @since 1.0.0
 */
import type { TaggedRequest } from "@effect/schema/Schema"
import type { Clustered, Standard } from "./Entity.js"

interface EntityRegistered<Msg extends TaggedRequest.Any> {
  readonly _tag: "EntityRegistered"
  readonly entity: Standard<Msg>
}

/**
 * Constructs and event that occurs when a new entity gets registered.
 *
 * @since 1.0.0
 * @category constructors
 */
export function EntityRegistered<Msg extends TaggedRequest.Any>(
  entity: Standard<Msg>
): ShardingRegistrationEvent {
  return ({ _tag: "EntityRegistered", entity })
}

interface SingletonRegistered {
  _tag: "SingletonRegistered"
  name: string
}

/**
 * Constructs a new event that occurs when a new Singleton is registered.
 *
 * @since 1.0.0
 * @category constructors
 */
export function SingletonRegistered(name: string): ShardingRegistrationEvent {
  return ({ _tag: "SingletonRegistered", name })
}

interface TopicRegistered<Msg extends TaggedRequest.Any> {
  _tag: "TopicRegistered"
  entity: Clustered<Msg>
}

/**
 * Constructs a new event that occurs when a topic is Registered.
 * @since 1.0.0
 * @category constructors
 */
export function TopicRegistered<Msg extends TaggedRequest.Any>(
  entity: Clustered<Msg>
): ShardingRegistrationEvent {
  return ({ _tag: "TopicRegistered", entity })
}

/**
 * @since 1.0.0
 * @category models
 */
export type ShardingRegistrationEvent =
  | EntityRegistered<any>
  | SingletonRegistered
  | TopicRegistered<any>
