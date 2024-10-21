/**
 * @since 1.0.0
 */
import type { TaggedRequest } from "@effect/schema/Schema"
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type { Entity } from "./Entity.js"
import * as Internal from "./internal/recipientBehaviourContext.js"
import type { RecipientAddress } from "./RecipientAddress.js"
import type { ShardId } from "./ShardId.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const RecipientBehaviourContextTypeId: unique symbol = Internal.RecipientBehaviourContextTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type RecipientBehaviourContextTypeId = typeof RecipientBehaviourContextTypeId

/**
 * This is the context information that is available to the RecipientBehaviour and has general informations
 * about this specific entity, like the entityId or the recipientType.
 *
 * @since 1.0.0
 * @category models
 */
export interface RecipientBehaviourContext {
  readonly [RecipientBehaviourContextTypeId]: RecipientBehaviourContextTypeId
  readonly address: RecipientAddress
  readonly shardId: ShardId
  readonly entity: Entity<TaggedRequest.Any>
  readonly forkShutdown: Effect.Effect<void>
}

/**
 * A tag to access current RecipientBehaviourContext
 *
 * @since 1.0.0
 * @category context
 */
export const RecipientBehaviourContext: Context.Tag<RecipientBehaviourContext, RecipientBehaviourContext> =
  Internal.recipientBehaviourContextTag

/**
 * Creates a new RecipientBehaviourContext
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  args: Omit<RecipientBehaviourContext, typeof RecipientBehaviourContextTypeId>
) => RecipientBehaviourContext = Internal.make

/**
 * Gets the current entityId
 *
 * @since 1.0.0
 * @category utils
 */
export const entityId: Effect.Effect<string, never, RecipientBehaviourContext> = Internal.entityId

/**
 * Gets the current entityId
 *
 * @since 1.0.0
 * @category utils
 */
export const recipientAddress: Effect.Effect<RecipientAddress, never, RecipientBehaviourContext> =
  Internal.recipientAddress

/**
 * Gets the current shardId
 *
 * @since 1.0.0
 * @category utils
 */
export const shardId: Effect.Effect<ShardId, never, RecipientBehaviourContext> = Internal.shardId

/**
 * Gets the current recipientType
 *
 * @since 1.0.0
 * @category utils
 */
export const entity: Effect.Effect<
  Entity<TaggedRequest.Any>,
  never,
  RecipientBehaviourContext
> = Internal.entity

/**
 * Forks the shutdown of the current recipient behaviour as soon as possible.
 *
 * @since 1.0.0
 * @category utils
 */
export const forkShutdown: Effect.Effect<void, never, RecipientBehaviourContext> = Internal.forkShutdown
