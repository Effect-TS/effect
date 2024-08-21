/**
 * @since 1.0.0
 */
import type { WithResult } from "@effect/schema/Serializable"
import type { SqlClient } from "@effect/sql/SqlClient"
import type { NoSuchElementException } from "effect/Cause"
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { EntityAddress } from "./EntityAddress.js"
import type { Envelope } from "./Envelope.js"
import * as InternalMailboxStorage from "./internal/mailboxStorage.js"
import type { Mailbox } from "./Mailbox.js"
import type { MessageState } from "./MessageState.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = InternalMailboxStorage.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface MailboxStorage extends MailboxStorage.Proto {
  /**
   * Save the provided message and its associated metadata.
   */
  readonly saveMessage: <Msg extends Envelope.AnyMessage>(
    address: EntityAddress,
    message: Msg
  ) => Effect<Mailbox.Entry<Msg>, NoSuchElementException>
  /**
   * Updates the specified message using the provided `MessageState`.
   */
  readonly updateMessage: <Msg extends Envelope.AnyMessage>(
    address: EntityAddress,
    message: Msg,
    state: MessageState<WithResult.Success<Msg>, WithResult.Failure<Msg>>
  ) => Effect<void>
}

/**
 * @since 1.0.0
 */
export declare namespace MailboxStorage {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
  }
}

/**
 * @since 1.0.0
 * @category context
 */
export const MailboxStorage: Tag<MailboxStorage, MailboxStorage> = InternalMailboxStorage.Tag

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSql: Layer<MailboxStorage, never, SqlClient> = InternalMailboxStorage.layerSql
