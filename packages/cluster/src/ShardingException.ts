/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"
import { EntityAddress } from "./EntityAddress.js"
import { PodAddress } from "./PodAddress.js"

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
) {}

/**
 * Represents an error that occurs when a message fails to be properly
 * deserialized by an entity.
 *
 * @since 1.0.0
 * @category errors
 */
export class MalformedMessage extends Schema.TaggedError<MalformedMessage>()(
  "MalformedMessage",
  { cause: Schema.Unknown }
) {}

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
    cause: Schema.Unknown
  }
) {}

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
) {}

/**
 * Represents an error that occurs when a pod is unresponsive.
 *
 * @since 1.0.0
 * @category errors
 */
export class PodUnavailable extends Schema.TaggedError<PodUnavailable>()(
  "PodUnavailable",
  {
    address: PodAddress
  }
) {}
