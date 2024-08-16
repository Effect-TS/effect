import * as SqlClient from "@effect/sql/SqlClient"
import type * as SqlError from "@effect/sql/SqlError"
import * as SqlSchema from "@effect/sql/SqlSchema"
import * as Statement from "@effect/sql/Statement"
import type { NoSuchElementException } from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import type { Serializable } from "effect/Schema"
import * as String from "effect/String"
import type { EntityAddress } from "../EntityAddress.js"
import { EntityId } from "../EntityId.js"
import { EntityType } from "../EntityType.js"
import type { Envelope } from "../Envelope.js"
import type * as MailboxStorage from "../MailboxStorage.js"
import { MessageId } from "../MessageId.js"
import * as MessageState from "../MessageState.js"
import { ShardId } from "../ShardId.js"
import { MessagePersistenceError } from "../ShardingException.js"

const SymbolKey = "@effect/cluster/MailboxStorage"

/** @internal */
export const TypeId: MailboxStorage.TypeId = Symbol.for(SymbolKey) as MailboxStorage.TypeId

/** @internal */
export const Tag = Context.GenericTag<MailboxStorage.MailboxStorage>(SymbolKey)

// /**
//  * A schema which converts between a bit (encoded) to a boolean (decoded).
//  */
// const BooleanFromBit = Schema.transformLiterals(
//   [0, false],
//   [1, true]
// )

/**
 * Represents identifiers that associate to a specific entity.
 */
const EntityIdentifiers = Schema.Struct({
  shardId: ShardId,
  entityId: EntityId,
  entityType: EntityType
})

/**
 * Represents identifiers that associate to a specific message.
 */
const MessageIdentifiers = Schema.Struct({
  ...EntityIdentifiers.fields,
  messageId: MessageId.pipe(Schema.compose(Schema.NonEmptyTrimmedString))
})

/**
 * Represents a request to save a message to the cluster storage.
 */
const SaveMessage = Schema.Struct({
  ...MessageIdentifiers.fields,
  messageBody: Schema.parseJson(Schema.Unknown)
})

/**
 * Represents a request to complete a message in the cluster storage.
 */
const CompleteMessage = Schema.Struct({
  ...MessageIdentifiers.fields,
  messageResult: Schema.parseJson(Schema.Unknown)
})

/**
 * Represents an entry in the persistent mailbox storage of the cluster.
 */
const MailboxStorageEntry = Schema.Struct({
  ...EntityIdentifiers.fields,
  message: Schema.parseJson(Schema.Unknown),
  sequenceNumber: Schema.Int
})

/** @internal */
export const makeSql: Effect.Effect<
  MailboxStorage.MailboxStorage,
  never,
  SqlClient.SqlClient
> = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient

  const insert = SqlSchema.findOne({
    Request: SaveMessage,
    Result: MailboxStorageEntry,
    execute: (request) => {
      const transformResults = Statement.defaultTransforms(
        String.snakeToCamel
      ).array
      return sql.onDialectOrElse({
        mysql: () => {
          const insert = sql`
            INSERT INTO mailbox (
              shard_id,
              entity_id,
              entity_type,
              message_id,
              message_body,
              message_sequence_number
            )
            SELECT 
              ${request.shardId}, 
              ${request.entityId}, 
              ${request.entityType}, 
              ${request.messageId}, 
              ${request.messageBody}, 
              COALESCE(
                (
                  SELECT MAX(message_sequence_number) + 1
                  FROM mailbox
                  WHERE entity_id = ${request.entityId}
                    AND entity_type = ${request.entityType}
                ),
                0
              )
            WHERE NOT EXISTS (
              SELECT 1
              FROM mailbox
              WHERE entity_id = ${request.entityId}
                AND entity_type = ${request.entityType}
                AND message_id = ${request.messageId}
            )
          `.raw as Effect.Effect<
            { readonly affectedRows: number },
            SqlError.SqlError
          >

          const select = sql`
            SELECT 
              shard_id,
              entity_id,
              entity_type,
              message_id,
              message_body,
              message_sequence_number
            FROM mailbox
            WHERE entity_id = ${request.entityId}
              AND entity_type = ${request.entityType}
              AND message_id = ${request.messageId}
          `.withoutTransform

          return insert.pipe(
            Effect.flatMap((result) => result.affectedRows > 0 ? select : Effect.succeed([])),
            Effect.map(transformResults)
          )
        },
        orElse: () =>
          sql`
            INSERT INTO mailbox (
              shard_id,
              entity_id,
              entity_type,
              message_id,
              message_body,
              message_sequence_number
            )
            SELECT 
              ${request.shardId}, 
              ${request.entityId}, 
              ${request.entityType}, 
              ${request.messageId}, 
              ${request.messageBody}, 
              COALESCE(
                (
                  SELECT MAX(message_sequence_number) + 1
                  FROM mailbox
                  WHERE entity_id = ${request.entityId}
                    AND entity_type = ${request.entityType}
                ),
                0
              )
            WHERE NOT EXISTS (
              SELECT 1
              FROM mailbox
              WHERE entity_id = ${request.entityId}
                AND entity_type = ${request.entityType}
                AND message_id = ${request.messageId}
            )
            RETURNING 
              shard_id,
              entity_id,
              entity_type,
              message_id,
              message_body,
              message_sequence_number
          `.withoutTransform.pipe(Effect.map(transformResults))
      })
    }
  })

  const acknowledge = SqlSchema.void({
    Request: MessageIdentifiers,
    execute: (request) =>
      sql`
        UPDATE mailbox
        SET message_acknowledged = 1
        WHERE shard_id = ${request.shardId}
          AND entity_type = ${request.entityType}
          AND entity_id = ${request.entityId}
          AND message_id = ${request.messageId}
          AND message_acknowledged = 0
          AND message_result IS NULL
      `.withoutTransform
  })

  const complete = SqlSchema.void({
    Request: CompleteMessage,
    execute: (request) =>
      sql`
        UPDATE mailbox
        SET message_acknowledged = 1,
            message_result = ${request.messageResult}
        WHERE shard_id = ${request.shardId}
          AND entity_type = ${request.entityType}
          AND entity_id = ${request.entityId}
          AND message_id = ${request.messageId}
          AND message_result IS NULL
      `.withoutTransform
  })

  const saveMessage = <Msg extends Envelope.AnyMessage>(
    address: EntityAddress,
    message: Msg
  ): Effect.Effect<
    MailboxStorage.MailboxStorage.Entry<Msg>,
    NoSuchElementException | MessagePersistenceError,
    Serializable.Context<Msg>
  > =>
    Schema.serialize(message).pipe(
      Effect.flatMap((messageBody) =>
        insert({
          shardId: address.shardId,
          entityId: address.entityId,
          entityType: address.entityType,
          messageId: PrimaryKey.value(message),
          messageBody
        })
      ),
      Effect.flatten,
      Effect.flatMap((entry) =>
        Schema.deserialize(message, entry.message).pipe(
          Effect.map((message) => ({ ...entry, message }))
        )
      ),
      Effect.catchTags({
        ParseError: (cause) => new MessagePersistenceError({ address, cause }),
        SqlError: (cause) => new MessagePersistenceError({ address, cause })
      })
    ) as any

  const updateMessage = <Msg extends Envelope.AnyMessage>(
    address: EntityAddress,
    message: Msg,
    state: MessageState.MessageState<
      Schema.WithResult.Success<Msg>,
      Schema.WithResult.Failure<Msg>
    >
  ): Effect.Effect<void> => {
    const params = {
      shardId: address.shardId,
      entityType: address.entityType,
      entityId: address.entityId,
      messageId: PrimaryKey.value(message)
    }
    return MessageState.match(state, {
      onAcknowledged: () => acknowledge(params),
      onProcessed: (exit) =>
        Schema.serializeExit(message, exit).pipe(
          Effect.flatMap((messageResult) => complete({ ...params, messageResult }))
        ) as any
    }).pipe(Effect.orDie)
  }

  return {
    [TypeId]: TypeId,
    saveMessage,
    updateMessage
  } as const
})

/** @internal */
export const layerSql: Layer.Layer<
  MailboxStorage.MailboxStorage,
  never,
  SqlClient.SqlClient
> = Layer.effect(Tag, makeSql)
