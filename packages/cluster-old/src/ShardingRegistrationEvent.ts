/**
 * @since 1.0.0
 */
import type * as Message from "./Message.js"
import type * as RecipientType from "./RecipientType.js"

interface EntityRegistered<Msg extends Message.Message.Any> {
  _tag: "EntityRegistered"
  entityType: RecipientType.EntityType<Msg>
}

/**
 * Constructs and event that occurs when a new EntityType gets registered.
 *
 * @since 1.0.0
 * @category constructors
 */
export function EntityRegistered<Msg extends Message.Message.Any>(
  entityType: RecipientType.EntityType<Msg>
): ShardingRegistrationEvent {
  return ({ _tag: "EntityRegistered", entityType })
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

interface TopicRegistered<Msg extends Message.Message.Any> {
  _tag: "TopicRegistered"
  topicType: RecipientType.TopicType<Msg>
}

/**
 * Constructs a new event that occurs when a topic is Registered.
 * @since 1.0.0
 * @category constructors
 */
export function TopicRegistered<Msg extends Message.Message.Any>(
  topicType: RecipientType.TopicType<Msg>
): ShardingRegistrationEvent {
  return ({ _tag: "TopicRegistered", topicType })
}

/**
 * @since 1.0.0
 * @category models
 */
export type ShardingRegistrationEvent =
  | EntityRegistered<any>
  | SingletonRegistered
  | TopicRegistered<any>
