/**
 * @since 1.0.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { hasProperty, isTagged } from "effect/Predicate"
import * as Schema from "effect/Schema"
import { EntityAddress } from "./EntityAddress.js"
import { RunnerAddress } from "./RunnerAddress.js"
import { SnowflakeFromString } from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category Symbols
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/ClusterError")

/**
 * @since 1.0.0
 * @category Symbols
 */
export type TypeId = typeof TypeId

/**
 * Represents an error that occurs when a Runner receives a message for an entity
 * that it is not assigned to it.
 *
 * @since 1.0.0
 * @category errors
 */
export class EntityNotAssignedToRunner extends Schema.TaggedError<EntityNotAssignedToRunner>()(
  "EntityNotAssignedToRunner",
  { address: EntityAddress }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is EntityNotAssignedToRunner {
    return hasProperty(u, TypeId) && isTagged(u, "EntityNotAssignedToRunner")
  }
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
  static is(u: unknown): u is MalformedMessage {
    return hasProperty(u, TypeId) && isTagged(u, "MalformedMessage")
  }

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
export class PersistenceError extends Schema.TaggedError<PersistenceError>()(
  "PersistenceError",
  { cause: Schema.Defect }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static refail<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, PersistenceError, R> {
    return Effect.catchAllCause(effect, (cause) => Effect.fail(new PersistenceError({ cause: Cause.squash(cause) })))
  }
}

/**
 * Represents an error that occurs when a Runner is not registered with the shard
 * manager.
 *
 * @since 1.0.0
 * @category errors
 */
export class RunnerNotRegistered extends Schema.TaggedError<RunnerNotRegistered>()(
  "RunnerNotRegistered",
  { address: RunnerAddress }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * Represents an error that occurs when a Runner is unresponsive.
 *
 * @since 1.0.0
 * @category errors
 */
export class RunnerUnavailable extends Schema.TaggedError<RunnerUnavailable>()(
  "RunnerUnavailable",
  { address: RunnerAddress }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is RunnerUnavailable {
    return hasProperty(u, TypeId) && isTagged(u, "RunnerUnavailable")
  }
}

/**
 * Represents an error that occurs when the entities mailbox is full.
 *
 * @since 1.0.0
 * @category errors
 */
export class MailboxFull extends Schema.TaggedError<MailboxFull>()(
  "MailboxFull",
  { address: EntityAddress }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is MailboxFull {
    return hasProperty(u, TypeId) && isTagged(u, "MailboxFull")
  }
}

/**
 * Represents an error that occurs when the entity is already processing a
 * request.
 *
 * @since 1.0.0
 * @category errors
 */
export class AlreadyProcessingMessage extends Schema.TaggedError<AlreadyProcessingMessage>()(
  "AlreadyProcessingMessage",
  {
    envelopeId: SnowflakeFromString,
    address: EntityAddress
  }
) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId] = TypeId

  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is AlreadyProcessingMessage {
    return hasProperty(u, TypeId) && isTagged(u, "AlreadyProcessingMessage")
  }
}
