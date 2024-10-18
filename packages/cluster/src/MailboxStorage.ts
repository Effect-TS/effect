import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as SqlClient from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import * as SqlSchema from "@effect/sql/SqlSchema"
import * as Effect from "effect/Effect"
import type { Exit } from "effect/Exit"
import * as Struct from "effect/Struct"
import type { Envelope } from "./Envelope.js"
import * as MessageState from "./MessageState.js"
import type { SerializedEnvelope } from "./SerializedEnvelope.js"
import { SerializedMessage } from "./SerializedMessage.js"
import { SerializedValue } from "./SerializedValue.js"

/*
 * The following database schemas are relevant to the mailbox storage
 * implementation:
 *
 * CREATE TABLE mailbox (
 *   shard_id SMALLINT NOT NULL,
 *   entity_id VARCHAR(255) NOT NULL,
 *   entity_type VARCHAR(255) NOT NULL,
 *   message_id VARCHAR(255) NOT NULL,
 *   message_body TEXT,
 *   message_acknowledged TINYINT(1) NOT NULL DEFAULT 0, -- 0 = received, 1 = acknowledged
 *   message_sequence_number INT NOT NULL,
 *   message_result TEXT,
 *   PRIMARY KEY (entity_id, entity_type, message_id),
 *   CONSTRAINT unique_message_sequence UNIQUE (
 *    entity_id,
 *    entity_type,
 *    message_sequence_number
 *   )
 * );
 */

// =============================================================================
// Helper Schemas
// =============================================================================

const ResultSchema = Schema.Exit({
  success: SerializedValue,
  failure: SerializedValue,
  defect: Schema.Defect
})

const BooleanFromByte = Schema.transform(
  Schema.Literal(0, 1),
  Schema.Boolean,
  {
    encode: (bool) => bool ? 1 : 0,
    decode: (bit) => bit === 1 ? true : false,
    strict: true
  }
)

const PositiveIntFromString = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.positive()
)

const Identifiers = Schema.Struct({
  shardId: PositiveIntFromString,
  entityId: Schema.NonEmptyString,
  entityType: Schema.NonEmptyString
})

const MessageIdentifiers = Schema.Struct({
  ...Identifiers.fields,
  messageId: Schema.NonEmptyString
})

// =============================================================================
// Request / Result Schemas
// =============================================================================

class GetMessages extends Schema.Class<GetMessages>(
  "@effect/cluster/MailboxStorage/GetMessages"
)({
  ...Identifiers.fields,
  cursor: Schema.optional(PositiveIntFromString),
  limit: Schema.optional(PositiveIntFromString)
}) {}

class MailboxEntry extends Schema.Class<MailboxEntry>(
  "@effect/cluster/MailboxStorage/Entry"
)({
  ...MessageIdentifiers.fields,
  messageBody: Schema.parseJson(SerializedMessage),
  messageAcknowledged: BooleanFromByte,
  messageSequenceNumber: PositiveIntFromString
}) {}

class InsertMessage extends Schema.Class<InsertMessage>(
  "@effect/cluster/MailboxStorage/InsertMessage"
)({
  ...MessageIdentifiers.fields,
  messageBody: Schema.parseJson(SerializedMessage),
  messageSequenceNumber: PositiveIntFromString
}) {
  static from = (
    envelope: SerializedEnvelope,
    messageSequenceNumber: number
  ) =>
    new InsertMessage({
      shardId: envelope.address.shardId,
      entityId: envelope.address.entityId,
      entityType: envelope.address.entityType,
      messageId: envelope.messageId,
      messageBody: envelope.message,
      messageSequenceNumber
    })
}

class AcknowledgeMessage extends Schema.Class<AcknowledgeMessage>(
  "@effect/cluster/MailboxStorage/AcknowledgeMessage"
)({ ...MessageIdentifiers.fields }) {
  static from = (envelope: SerializedEnvelope) =>
    new AcknowledgeMessage({
      shardId: envelope.address.shardId,
      entityId: envelope.address.entityId,
      entityType: envelope.address.entityType,
      messageId: envelope.messageId
    })
}

class CompleteMessage extends Schema.Class<CompleteMessage>(
  "@effect/cluster/MailboxStorage/CompleteMessage"
)({
  ...AcknowledgeMessage.fields,
  messageResult: Schema.parseJson(ResultSchema)
}) {
  static from = (
    envelope: SerializedEnvelope,
    result: Exit<SerializedValue, SerializedValue>
  ) =>
    new CompleteMessage({
      shardId: envelope.address.shardId,
      entityId: envelope.address.entityId,
      entityType: envelope.address.entityType,
      messageId: envelope.messageId,
      messageResult: result
    })
}

// =============================================================================
// Service Definition
// =============================================================================

export class MailboxStorage extends Effect.Tag("@effect/cluster/MailboxStorage")<
  MailboxStorage,
  MailboxStorage.Service
>() {}

export declare namespace MailboxStorage {
  export interface RetrieveOptions {
    /**
     * A cursor that can be used to skip messages in the persistent mailbox
     * storage. Any message with a sequence number less than the cursor value
     * will be skipped.
     */
    readonly from?: number
    /**
     * The maximum number of messages to retrieve from the persistent mailbox
     * storage.
     */
    readonly limit?: number
  }

  export interface Service {
    /**
     * Retreives a message for the specified entity from the mailbox storage.
     *
     * Can optionally specify the message sequence number to start `from` as
     * well as `limit`ing the number of messages retrieved.
     */
    readonly get: {
      (
        shardId: number,
        entityId: string,
        entityType: string,
        options?: {
          readonly from?: number | undefined
          readonly limit?: 1 | undefined
        }
      ): Effect.Effect<MailboxEntry, ParseError | SqlError>
      (
        shardId: number,
        entityId: string,
        entityType: string,
        options?: {
          readonly from?: number | undefined
          readonly limit: number
        }
      ): Effect.Effect<ReadonlyArray<MailboxEntry>, ParseError | SqlError>
    }
    /**
     * Inserts a message into the cluster's persistent mailbox storage and
     * marks the message as having been received.
     *
     * The following invariants apply when adding a message to the storage:
     *
     *   - Duplicate messages (i.e. messages with the same `messageId`) should
     *     **NOT** be received by the mailbox storage
     */
    readonly insert: (
      /**
       * The envelope containing information about the message to store.
       */
      envelope: SerializedEnvelope,
      /**
       * The order in which the message was received by the target entity.
       */
      sequenceNumber: number
    ) => Effect.Effect<void, ParseError | SqlError>

    /**
     * Updates  a message in the cluster's persistent mailbox storage based
     * upon the provided `MessageState`.
     */
    readonly update: (
      /**
       * The envelope containing information about the message to store.
       */
      envelope: Envelope<SerializedMessage>,
      /**
       * The state of the message.
       */
      messsageState: MessageState.MessageState<SerializedValue, SerializedValue>
    ) => Effect.Effect<void, ParseError | SqlError>
  }
}

// =============================================================================
// Implementation
// =============================================================================

export const make: Effect.Effect<MailboxStorage.Service, never, SqlClient.SqlClient> = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient

  const getMessages = SqlSchema.findAll({
    Request: GetMessages,
    Result: MailboxEntry,
    execute: (request) => {
      const cursor = request?.cursor ?? 0
      const limit = request?.limit ?? 1
      return sql`
        SELECT 
          shard_id,
          entity_id,
          entity_type,
          message_id,
          message_body,
          message_acknowledged,
          message_sequence_number
        FROM mailbox
        WHERE shard_id = ${request.shardId}
          AND entity_id = ${request.entityId}
          AND entity_type = ${request.entityType}
          AND message_sequence_number >= ${cursor}
          AND message_acknowledged == 0
          AND message_result IS NULL
        LIMIT ${limit}
      `.pipe(
        Effect.withSpan("MailBoxStorage.retrieve", {
          attributes: request
        })
      )
    }
  })

  const get: {
    (
      shardId: number,
      entityId: string,
      entityType: string,
      options?: {
        readonly from?: number | undefined
        readonly limit?: 1 | undefined
      } | undefined
    ): Effect.Effect<MailboxEntry, ParseError | SqlError>
    (
      shardId: number,
      entityId: string,
      entityType: string,
      options?: {
        readonly from?: number | undefined
        readonly limit: number
      } | undefined
    ): Effect.Effect<ReadonlyArray<MailboxEntry>, ParseError | SqlError>
  } = (
    shardId: number,
    entityId: string,
    entityType: string,
    options?: {
      readonly from?: number | undefined
      readonly limit?: number | undefined
    }
  ) => {
    const args = { shardId, entityId, entityType, ...options }
    return getMessages(new GetMessages(args)) as any
  }

  const insertMessage = SqlSchema.void({
    Request: InsertMessage,
    execute: (request) => {
      const valuesToInsert = sql.csv(Object.values(request))
      return sql`
        INSERT INTO mailbox (
          shard_id, 
          entity_id, 
          entity_type, 
          message_id, 
          message_body,
          message_sequence_number,
        )
        SELECT ${valuesToInsert}
        WHERE NOT EXISTS (
          SELECT 1 
          FROM mailbox 
          WHERE shard_id = ${request.shardId}
            AND entity_id = ${request.entityId}
            AND entity_type = ${request.entityType}
            AND message_id = ${request.messageId}
        )
      `.pipe(
        Effect.withSpan("MailBoxStorage.insert", {
          attributes: Struct.omit(request, "messageBody")
        })
      )
    }
  })

  const insert = (
    envelope: SerializedEnvelope,
    sequenceNumber: number
  ): Effect.Effect<void, ParseError | SqlError> => {
    const request = InsertMessage.from(envelope, sequenceNumber)
    return insertMessage(request)
  }

  const acknowledgeMessage = SqlSchema.void({
    Request: AcknowledgeMessage,
    execute: (request) => {
      return sql`
        UPDATE mailbox 
        SET message_acknowledged = 1
        WHERE shard_id = ${request.shardId}
          AND entity_id = ${request.entityId}
          AND entity_type = ${request.entityType}
          AND message_id = ${request.messageId}
      `.pipe(
        Effect.withSpan("MailboxStorage.update", {
          attributes: request
        })
      )
    }
  })

  const completeMessage = SqlSchema.void({
    Request: CompleteMessage,
    execute: (request) => {
      return sql`
        UPDATE mailbox 
        SET message_acknowledged = 1,
            message_result = ${request.messageResult}
        WHERE shard_id = ${request.shardId}
          AND entity_id = ${request.entityId}
          AND entity_type = ${request.entityType}
          AND message_id = ${request.messageId}
          AND message_result IS NULL
      `.pipe(
        Effect.withSpan("MailboxStorage.update", {
          attributes: Struct.omit(request, "messageResult")
        })
      )
    }
  })

  const update = (
    envelope: SerializedEnvelope,
    state: MessageState.MessageState<SerializedValue, SerializedValue>
  ): Effect.Effect<void, ParseError | SqlError> => {
    return MessageState.match(state, {
      onAcknowledged: () => acknowledgeMessage(AcknowledgeMessage.from(envelope)),
      onProcessed: (result) => completeMessage(CompleteMessage.from(envelope, result))
    })
  }

  return {
    get,
    insert,
    update
  } as const
})
