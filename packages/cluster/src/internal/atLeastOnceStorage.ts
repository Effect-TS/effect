import * as Schema from "@effect/schema/Schema"
import * as SqlClient from "@effect/sql/SqlClient"
import type * as SqlError from "@effect/sql/SqlError"
import * as SqlResolver from "@effect/sql/SqlResolver"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import type * as AtLeastOnceStorage from "../AtLeastOnceStorage.js"
import * as Envelope from "../Envelope.js"
import { RecipientAddress } from "../RecipientAddress.js"
import type * as Serialization from "../Serialization.js"
import * as SerializedMessage from "../SerializedMessage.js"
import * as SerializedValue from "../SerializedValue.js"
import * as InternalSerialization from "./serialization.js"

/** @internal */
const SymbolKey = "@effect/cluster/AtLeastOnceStorage"

/** @internal */
export const TypeId: AtLeastOnceStorage.TypeId = Symbol.for(
  SymbolKey
) as AtLeastOnceStorage.TypeId

/** @internal */
export const atLeastOnceStorageTag: Context.Tag<
  AtLeastOnceStorage.AtLeastOnceStorage,
  AtLeastOnceStorage.AtLeastOnceStorage
> = Context.GenericTag<AtLeastOnceStorage.AtLeastOnceStorage>(SymbolKey)

const make = ({ table }: AtLeastOnceStorage.AtLeastOnceStorage.MakeOptions): Effect.Effect<
  AtLeastOnceStorage.AtLeastOnceStorage,
  SqlError.SqlError,
  SqlClient.SqlClient | Serialization.Serialization
> =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    const serialization = yield* InternalSerialization.serializationTag

    yield* sql.onDialect({
      mssql: () =>
        sql`
          IF OBJECT_ID(N'${sql.literal(table)}', N'U') IS NULL
          CREATE TABLE ${sql(table)} (
            recipient_name VARCHAR(255) NOT NULL,
            shard_id INT NOT NULL DEFAULT 0,
            entity_id VARCHAR(255) NOT NULL,
            message_id VARCHAR(255) NOT NULL,
            message_body TEXT NOT NULL,
            processed BIT NOT NULL DEFAULT 0,
            CONSTRAINT ${sql(table)}_pkey PRIMARY KEY (recipient_name, entity_id, message_id)
              WITH (IGNORE_DUP_KEY = ON)
          )
        `,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(table)} (
            recipient_name VARCHAR(255) NOT NULL,
            shard_id INT NOT NULL DEFAULT 0,
            entity_id VARCHAR(255) NOT NULL,
            message_id VARCHAR(255) NOT NULL,
            message_body TEXT NOT NULL,
            processed BOOLEAN NOT NULL DEFAULT FALSE,
            CONSTRAINT ${sql(table)}_pkey PRIMARY KEY (recipient_name, entity_id, message_id)
          )
        `,
      pg: () =>
        Effect.catchAll(sql`SELECT ${table}::regclass`, () =>
          sql`
            CREATE TABLE ${sql(table)} (
              recipient_name VARCHAR(255) NOT NULL,
              shard_id INT NOT NULL DEFAULT 0,
              entity_id VARCHAR(255) NOT NULL,
              message_id VARCHAR(255) NOT NULL,
              message_body TEXT NOT NULL,
              processed BOOLEAN NOT NULL DEFAULT FALSE,
              CONSTRAINT ${sql(table)}_pkey PRIMARY KEY (recipient_name, entity_id, message_id)
            )
          `),
      sqlite: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql.literal(table)} (
            recipient_name VARCHAR(255) NOT NULL,
            shard_id INT NOT NULL DEFAULT (0),
            entity_id VARCHAR(255) NOT NULL,
            message_id VARCHAR(255) NOT NULL,
            message_body CLOB NOT NULL,
            processed BOOLEAN NOT NULL DEFAULT (0),
            CONSTRAINT ${sql.literal(table)}_pkey PRIMARY KEY (recipient_name, entity_id, message_id)
          )
        `
    })

    const UpsertEntryResolver = yield* SqlResolver.void("UpsertEntry", {
      Request: Schema.Struct({
        recipient_name: Schema.String,
        shard_id: Schema.Number,
        entity_id: Schema.String,
        message_id: Schema.String,
        message_body: Schema.String
      }),
      execute: (requests) =>
        sql.onDialect({
          mssql: () =>
            sql`
              INSERT INTO ${sql(table)}
              ${sql.insert(requests)}
            `,
          mysql: () =>
            sql`
              INSERT INTO ${sql(table)}
              ${sql.insert(requests)}
              ON DUPLICATE KEY UPDATE
                recipient_name = recipient_name,
                entity_id = entity_id,
                message_id = message_id
            `,
          pg: () =>
            sql`
              INSERT INTO ${sql(table)}
              ${sql.insert(requests)}
              ON CONFLICT ON CONSTRAINT ${sql(table)}_pkey DO NOTHING
            `,
          sqlite: () =>
            sql`
              INSERT INTO ${sql(table)}
              ${sql.insert(requests)}
              ON CONFLICT (recipient_name, entity_id, message_id) DO NOTHING
            `
        })
    })

    const SweepPendingResolver = yield* SqlResolver.ordered("SweepPending", {
      Request: Schema.Number,
      Result: Schema.Struct({
        shard_id: Schema.Number,
        entity_id: Schema.String,
        message_id: Schema.String,
        recipient_name: Schema.String,
        message_body: Schema.String
      }),
      execute: (shard_ids) =>
        sql`
          SELECT
            shard_id,
            entity_id,
            message_id,
            recipient_name,
            message_body
          FROM ${sql(table)}
          WHERE ${
          sql.and([
            sql`processed = ${false}`,
            sql.in("shard_id", shard_ids)
          ])
        }
        `
    })

    return {
      [TypeId]: TypeId,
      upsert: (entity, shardId, entityId, envelope) =>
        serialization.encode(entity.schema, envelope.message).pipe(
          Effect.flatMap(
            (message_body) =>
              UpsertEntryResolver.execute({
                recipient_name: entity.name,
                shard_id: shardId.value,
                entity_id: entityId,
                message_id: (envelope.messageId),
                message_body: message_body.value
              })
          ),
          Effect.catchAllCause(Effect.logError)
        ),
      markAsProcessed: (entity, _shardId, entityId, envelope) => {
        return sql`
          UPDATE ${sql(table)}
          SET ${
          sql.onDialectOrElse({
            pg: () => sql.update({ processed: "TRUE" }),
            orElse: () => sql.update({ processed: 1 })
          })
        }
          WHERE ${
          sql.and([
            sql`recipient_name = ${entity.name}`,
            sql`entity_id = ${entityId}`,
            sql`message_id = ${(envelope.messageId)}`
          ])
        }`.pipe(Effect.catchAllCause(Effect.logError))
      },
      sweepPending: (shardIds) =>
        Effect.forEach(shardIds, (id) =>
          Effect.withRequestCaching(true)(
            SweepPendingResolver.execute(id.value)
          ), {
          batching: true
        }).pipe(
          Effect.orDie,
          Stream.fromIterableEffect,
          Stream.map((entry) =>
            Envelope.make(
              new RecipientAddress({
                shardId: entry.shard_id,
                entityType: entry.recipient_name,
                entityId: entry.entity_id
              }),
              entry.message_id,
              SerializedMessage.make(SerializedValue.make(entry.message_body))
            )
          )
        )
    }
  })

/** @internal */
export const layer = (options: AtLeastOnceStorage.AtLeastOnceStorage.MakeOptions): Layer.Layer<
  AtLeastOnceStorage.AtLeastOnceStorage,
  SqlError.SqlError,
  SqlClient.SqlClient | Serialization.Serialization
> => Layer.effect(atLeastOnceStorageTag, make(options))
