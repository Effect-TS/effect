/**
 * @since 1.0.0
 */
import type { Message } from "@effect/cluster/Message"
import type { SqlClient } from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { Stream } from "effect/Stream"
import * as Internal from "./internal/atLeastOnceStorage.js"
import type { RecipientType } from "./RecipientType.js"
import type { Serialization } from "./Serialization.js"
import type { SerializedEnvelope } from "./SerializedEnvelope.js"
import type { ShardId } from "./ShardId.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId: unique symbol = Internal.TypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface AtLeastOnceStorage extends AtLeastOnceStorage.Proto {
  /**
   * Upserts a message into the storage, eventually returning the already
   * existing message state as result in the storage.
   */
  upsert<Msg extends Message.Any>(
    recipientType: RecipientType<Msg>,
    shardId: ShardId,
    entityId: string,
    message: Msg
  ): Effect<void>

  /**
   * Marks the specified message as processed to prevent additional attempts to
   * send the message.
   */
  markAsProcessed<Msg extends Message.Any>(
    recipientType: RecipientType<Msg>,
    shardId: ShardId,
    entityId: string,
    message: Msg
  ): Effect<void>

  /**
   * Returns a stream of messages that will be sent to the local pod as a second
   * attempt.
   */
  sweepPending(shardIds: Iterable<ShardId>): Stream<SerializedEnvelope>
}

/**
 * @since 1.0.0
 * @category context
 */
export const AtLeastOnceStorage: Tag<AtLeastOnceStorage, AtLeastOnceStorage> = Internal.atLeastOnceStorageTag

/**
 * @since 1.0.0
 */
export declare namespace AtLeastOnceStorage {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface MakeOptions {
    readonly table: string
  }
}

/**
 * @since 1.0.0
 * @category context
 */
export const layer: (
  options: AtLeastOnceStorage.MakeOptions
) => Layer<AtLeastOnceStorage, SqlError, SqlClient | Serialization> = Internal.layer
