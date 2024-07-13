/**
 * @since 1.0.0
 */
import type { Clustered, Standard } from "./Entity.js"
import type { Envelope } from "./Envelope.js"

interface EntityRegistered<Msg extends Envelope.AnyMessage> {
  readonly _tag: "EntityRegistered"
  readonly entity: Standard<Msg>
}

/**
 * Constructs and event that occurs when a new entity gets registered.
 *
 * @since 1.0.0
 * @category constructors
 */
export function EntityRegistered<Msg extends Envelope.AnyMessage>(
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

interface TopicRegistered<Msg extends Envelope.AnyMessage> {
  _tag: "TopicRegistered"
  entity: Clustered<Msg>
}

/**
 * Constructs a new event that occurs when a topic is Registered.
 * @since 1.0.0
 * @category constructors
 */
export function TopicRegistered<Msg extends Envelope.AnyMessage>(
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
