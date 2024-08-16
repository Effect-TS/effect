import * as Schema from "@effect/schema/Schema"
import * as SqlClient from "@effect/sql/SqlClient"
import * as Effect from "effect/Effect"
import { EntityId } from "../EntityId.js"
import { EntityType } from "../EntityType.js"
import { MessageId } from "../MessageId.js"
import { ShardId } from "../ShardId.js"
import type * as Storage from "../Storage.js"

export const makeSql = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient

  const SaveMessage = Schema.Struct({
    shardId: ShardId,
    entityId: EntityId,
    entityType: EntityType,
    messageId: MessageId,
    messageBody: Schema.NonEmptyString
  })

  const query = SqlSchema.single({
    Request: InsertMessage,
    Result: ResultSetHeader,
    execute: (request) => {
      return sql`
        INSERT INTO mailbox (
          shard_id,
          entity_id,
          entity_type,
          message_id,
          message_body,
          message_sequence_number
        )
        SELECT 
          ${request.shard_id}, 
          ${request.entity_id}, 
          ${request.entity_type}, 
          ${request.message_id}, 
          ${request.message_body}, 
          COALESCE(
            (
              SELECT MAX(message_sequence_number) + 1
              FROM mailbox
              WHERE entity_id = ${request.entity_id}
                AND entity_type = ${request.entity_type}
            ),
            0
          )
        WHERE NOT EXISTS (
          SELECT 1
          FROM mailbox
          WHERE entity_id = ${request.entity_id}
            AND entity_type = ${request.entity_type}
            AND message_id = ${request.message_id}
        )
      `.raw.pipe(Effect.map(Array.of))
    }
  })
})
