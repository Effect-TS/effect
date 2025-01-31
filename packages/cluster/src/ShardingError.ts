/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { EntityAddress } from "./EntityAddress.js"
import { PodAddress } from "./PodAddress.js"
import { SnowflakeFromString } from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/ShardingError")

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * Represents an error that occurs when a pod receives a message for an entity
 * that it is not responsible for managing.
 *
 * @since 1.0.0
 * @category errors
 */
export class EntityNotManagedByPod extends Schema.TaggedError<EntityNotManagedByPod>()(
  "EntityNotManagedByPod",
  { address: EntityAddress }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * Represents an error that occurs when a message fails to be properly
 * deserialized by an entity.
 *
 * @since 1.0.0
 * @category errors
 */
export class MalformedMessage extends Schema.TaggedError<MalformedMessage>()(
  "MalformedMessage",
  { cause: Schema.Defect }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static refail: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<
    A,
    MalformedMessage,
    R
  > = Effect.mapError((cause) => new MalformedMessage({ cause }))
}

/**
 * Represents an error that occurs when a message fails to be persisted into
 * cluster's mailbox storage.
 *
 * @since 1.0.0
 * @category errors
 */
export class MessagePersistenceError extends Schema.TaggedError<MessagePersistenceError>()(
  "MessagePersistenceError",
  {
    address: EntityAddress,
    cause: Schema.Defect
  }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * Represents an error that occurs when a pod is not registered with the shard
 * manager.
 *
 * @since 1.0.0
 * @category errors
 */
export class PodNotRegistered extends Schema.TaggedError<PodNotRegistered>()(
  "PodNotRegistered",
  { address: PodAddress }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * Represents an error that occurs when a pod is unresponsive.
 *
 * @since 1.0.0
 * @category errors
 */
export class PodUnavailable extends Schema.TaggedError<PodUnavailable>()(
  "PodUnavailable",
  { address: PodAddress }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * Represents an error when the sender Pod for a reply cannot be found.
 *
 * @since 1.0.0
 * @category errors
 */
export class ReplyPodNotFound extends Schema.TaggedError<ReplyPodNotFound>()(
  "ReplyPodNotFound",
  { requestId: SnowflakeFromString }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}
