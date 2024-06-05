/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Stream from "effect/Stream"
import * as internal from "./internal/atLeastOnceStorage.js"
import type * as Message from "./Message.js"
import type * as RecipientType from "./RecipientType.js"
import type * as SerializedEnvelope from "./SerializedEnvelope.js"
import type * as ShardId from "./ShardId.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const AtLeastOnceStorageTypeId: unique symbol = internal.AtLeastOnceStorageTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type AtLeastOnceStorageTypeId = typeof AtLeastOnceStorageTypeId

/**
 * @since 1.0.0
 * @category context
 */
export const Tag: Context.Tag<AtLeastOnceStorage, AtLeastOnceStorage> = internal.atLeastOnceStorageTag

/**
 * @since 1.0.0
 * @category models
 */
export interface AtLeastOnceStorage {
  readonly [AtLeastOnceStorageTypeId]: AtLeastOnceStorageTypeId

  /**
   * Stores a message into the storage, eventually returning the already existing message state as result in the storage
   */
  upsert<Msg extends Message.Message.Any>(
    recipientType: RecipientType.RecipientType<Msg>,
    shardId: ShardId.ShardId,
    entityId: string,
    message: Msg
  ): Effect.Effect<void>

  /**
   * Marks the message as processed, so no more send attempt will occur
   */
  markAsProcessed<Msg extends Message.Message.Any>(
    recipientType: RecipientType.RecipientType<Msg>,
    shardId: ShardId.ShardId,
    entityId: string,
    message: Msg
  ): Effect.Effect<void>

  /**
   * Gets a set of messages that will be sent to the local Pod as second attempt
   */
  sweepPending(
    shardIds: Iterable<ShardId.ShardId>
  ): Stream.Stream<SerializedEnvelope.SerializedEnvelope>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (data: Omit<AtLeastOnceStorage, AtLeastOnceStorageTypeId>) => AtLeastOnceStorage = internal.make
