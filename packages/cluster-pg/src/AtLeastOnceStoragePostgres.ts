/**
 * @since 1.0.0
 */
import * as AtLeastOnceStorage from "@effect/cluster/AtLeastOnceStorage"
import * as RecipientAddress from "@effect/cluster/RecipientAddress"
import * as Serialization from "@effect/cluster/Serialization"
import * as SerializedEnvelope from "@effect/cluster/SerializedEnvelope"
import * as SerializedMessage from "@effect/cluster/SerializedMessage"
import * as Sql from "@effect/sql"
import * as Pg from "@effect/sql-pg"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeAtLeastOnceStoragePostgres = (tableName: string) =>
  Layer.effect(
    AtLeastOnceStorage.Tag,
    Effect.gen(function*(_) {
      const sql = yield* _(Pg.client.PgClient)
      const serialization = yield* _(Serialization.Serialization)

      yield* _(sql`
    CREATE TABLE IF NOT EXISTS ${Sql.statement.unsafeFragment(tableName)}
    (
        recipient_name varchar(255) NOT NULL,
        shard_id integer DEFAULT 0,
        entity_id varchar(255) NOT NULL,
        message_id varchar(255) NOT NULL,
        message_body text NOT NULL,
        processed boolean DEFAULT FALSE NOT NULL,
        CONSTRAINT ${Sql.statement.unsafeFragment(tableName)}_pkey PRIMARY KEY (recipient_name, entity_id, message_id)
    )
    `)

      return AtLeastOnceStorage.make({
        upsert: (recipientType, shardId, entityId, message) =>
          pipe(
            serialization.encode(recipientType.schema, message),
            Effect.flatMap(
              (message_body) =>
                sql`INSERT INTO ${Sql.statement.unsafeFragment(tableName)} ${
                  sql.insert({
                    recipient_name: recipientType.name,
                    shard_id: shardId.value,
                    entity_id: entityId,
                    message_id: PrimaryKey.value(message),
                    message_body: message_body.value
                  })
                } ON CONFLICT ON CONSTRAINT ${Sql.statement.unsafeFragment(tableName)}_pkey DO NOTHING`
            ),
            Effect.catchAllCause(Effect.logError)
          ),
        markAsProcessed: (recipientType, shardId, entityId, message) =>
          pipe(
            sql`UPDATE ${Sql.statement.unsafeFragment(tableName)} SET processed = TRUE WHERE
                recipient_name = ${(recipientType.name)}
                AND entity_id = ${(entityId)}
                AND message_id = ${(PrimaryKey.value(message))}`,
            Effect.catchAllCause(Effect.logError)
          ),
        sweepPending: (shardIds) =>
          pipe(
            sql<{
              recipient_name: string
              entity_id: string
              message_id: string
              message_body: string
            }>`SELECT * FROM ${Sql.statement.unsafeFragment(tableName)} WHERE processed = FALSE AND shard_id IN ${
              sql.in(Array.from(shardIds).map((_) => _.value))
            }`.stream,
            Stream.orDie,
            Stream.map((_) =>
              SerializedEnvelope.make(
                RecipientAddress.makeRecipientAddress(_.recipient_name, _.entity_id),
                _.message_id,
                SerializedMessage.make(_.message_body)
              )
            )
          )
      })
    })
  )
