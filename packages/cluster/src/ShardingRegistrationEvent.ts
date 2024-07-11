/**
 * @since 1.0.0
 */
import type { Envelope } from "./Envelope.js"
import type { EntityType, TopicType } from "./RecipientType.js"

interface EntityRegistered<Msg extends Envelope.AnyMessage> {
  readonly _tag: "EntityRegistered"
  readonly entityType: EntityType<Msg>
}

/**
 * Constructs and event that occurs when a new EntityType gets registered.
 *
 * @since 1.0.0
 * @category constructors
 */
export function EntityRegistered<Msg extends Envelope.AnyMessage>(
  entityType: EntityType<Msg>
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

interface TopicRegistered<Msg extends Envelope.AnyMessage> {
  _tag: "TopicRegistered"
  topicType: TopicType<Msg>
}

/**
 * Constructs a new event that occurs when a topic is Registered.
 * @since 1.0.0
 * @category constructors
 */
export function TopicRegistered<Msg extends Envelope.AnyMessage>(
  topicType: TopicType<Msg>
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
