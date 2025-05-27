/**
 * @since 1.0.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import type { Row } from "@effect/sql/SqlConnection"
import type { SqlError } from "@effect/sql/SqlError"
import * as Arr from "effect/Array"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import { PersistenceError } from "./ClusterError.js"
import type * as Envelope from "./Envelope.js"
import * as MessageStorage from "./MessageStorage.js"
import { SaveResultEncoded } from "./MessageStorage.js"
import type * as Reply from "./Reply.js"
import type { ShardingConfig } from "./ShardingConfig.js"
import * as Snowflake from "./Snowflake.js"

const withTracerDisabled = Effect.withTracerEnabled(false)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options?: {
  readonly prefix?: string | undefined
}) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const prefix = options?.prefix ?? "cluster"
  const table = (name: string) => `${prefix}_${name}`

  const messageKindAckChunk = sql.literal(String(messageKind.AckChunk))
  const replyKindWithExit = sql.literal(String(replyKind.WithExit))

  const messagesTable = table("messages")
  const messagesTableSql = sql(messagesTable)

  const repliesTable = table("replies")
  const repliesTableSql = sql(repliesTable)

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`
        IF OBJECT_ID(N'${messagesTableSql}', N'U') IS NULL
        CREATE TABLE ${messagesTableSql} (
          id BIGINT PRIMARY KEY,
          rowid BIGINT IDENTITY(1,1),
          message_id VARCHAR(255),
          shard_id INT NOT NULL,
          entity_type VARCHAR(255) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          kind INT NOT NULL,
          tag VARCHAR(255),
          payload TEXT,
          headers TEXT,
          trace_id VARCHAR(255),
          span_id VARCHAR(255),
          sampled BIT,
          processed BIT NOT NULL DEFAULT 0,
          request_id BIGINT NOT NULL,
          reply_id BIGINT,
          last_reply_id BIGINT,
          last_read DATETIME,
          deliver_at BIGINT,
          UNIQUE (message_id),
          FOREIGN KEY (request_id) REFERENCES ${messagesTableSql} (id) ON DELETE CASCADE
        )
      `,
    mysql: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${messagesTableSql} (
          id BIGINT NOT NULL,
          rowid BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          message_id VARCHAR(255),
          shard_id INT NOT NULL,
          entity_type VARCHAR(255) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          kind INT NOT NULL,
          tag VARCHAR(255),
          payload TEXT,
          headers TEXT,
          trace_id VARCHAR(255),
          span_id VARCHAR(255),
          sampled BOOLEAN,
          processed BOOLEAN NOT NULL DEFAULT FALSE,
          request_id BIGINT NOT NULL,
          reply_id BIGINT,
          last_reply_id BIGINT,
          last_read DATETIME,
          deliver_at BIGINT,
          UNIQUE (id),
          UNIQUE (message_id),
          FOREIGN KEY (request_id) REFERENCES ${messagesTableSql} (id) ON DELETE CASCADE
        )
      `,
    pg: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${messagesTableSql} (
          id BIGINT PRIMARY KEY,
          rowid BIGSERIAL,
          message_id VARCHAR(255),
          shard_id INT NOT NULL,
          entity_type VARCHAR(255) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          kind INT NOT NULL,
          tag VARCHAR(255),
          payload TEXT,
          headers TEXT,
          trace_id VARCHAR(255),
          span_id VARCHAR(255),
          sampled BOOLEAN,
          processed BOOLEAN NOT NULL DEFAULT FALSE,
          request_id BIGINT NOT NULL,
          reply_id BIGINT,
          last_reply_id BIGINT,
          last_read TIMESTAMP,
          deliver_at BIGINT,
          UNIQUE (message_id),
          FOREIGN KEY (request_id) REFERENCES ${messagesTableSql} (id) ON DELETE CASCADE
        )
      `.pipe(Effect.ignore),
    orElse: () =>
      // sqlite
      sql`
        CREATE TABLE IF NOT EXISTS ${messagesTableSql} (
          id INTEGER PRIMARY KEY,
          message_id TEXT,
          shard_id INTEGER NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          kind INTEGER NOT NULL,
          tag TEXT,
          payload TEXT,
          headers TEXT,
          trace_id TEXT,
          span_id TEXT,
          sampled BOOLEAN,
          processed BOOLEAN NOT NULL DEFAULT FALSE,
          request_id INTEGER NOT NULL,
          reply_id INTEGER,
          last_reply_id INTEGER,
          last_read TEXT,
          deliver_at INTEGER,
          UNIQUE (message_id),
          FOREIGN KEY (request_id) REFERENCES ${messagesTableSql} (id) ON DELETE CASCADE
        )
      `
  })

  // Add message indexes optimized for the specific query patterns
  const shardLookupIndex = `${messagesTable}_shard_idx`
  const requestIdLookupIndex = `${messagesTable}_request_id_idx`
  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = ${shardLookupIndex})
        CREATE INDEX ${sql(shardLookupIndex)} 
        ON ${messagesTableSql} (shard_id, processed, last_read, deliver_at);

        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = ${requestIdLookupIndex})
        CREATE INDEX ${sql(requestIdLookupIndex)}
        ON ${messagesTableSql} (request_id);
      `,
    mysql: () =>
      sql`
        CREATE INDEX ${sql(shardLookupIndex)}
        ON ${messagesTableSql} (shard_id, processed, last_read, deliver_at);

        CREATE INDEX ${sql(requestIdLookupIndex)}
        ON ${messagesTableSql} (request_id);
      `.unprepared.pipe(Effect.ignore),
    pg: () =>
      sql`
        CREATE INDEX IF NOT EXISTS ${sql(shardLookupIndex)}
        ON ${messagesTableSql} (shard_id, processed, last_read, deliver_at);

        CREATE INDEX IF NOT EXISTS ${sql(requestIdLookupIndex)}
        ON ${messagesTableSql} (request_id);
      `.pipe(
        Effect.tapDefect((error) =>
          Effect.annotateLogs(Effect.logDebug("Failed to create indexes", error), {
            package: "@effect/cluster",
            module: "SqlMessageStorage"
          })
        ),
        Effect.retry({
          schedule: Schedule.spaced(1000)
        })
      ),
    orElse: () =>
      // sqlite
      Effect.all([
        sql`
          CREATE INDEX IF NOT EXISTS ${sql(shardLookupIndex)}
          ON ${messagesTableSql} (shard_id, processed, last_read, deliver_at)
        `,
        sql`
          CREATE INDEX IF NOT EXISTS ${sql(requestIdLookupIndex)}
          ON ${messagesTableSql} (request_id)
        `
      ]).pipe(sql.withTransaction)
  })

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`
        IF OBJECT_ID(N'${repliesTableSql}', N'U') IS NULL
        CREATE TABLE ${repliesTableSql} (
          id BIGINT PRIMARY KEY,
          rowid BIGINT IDENTITY(1,1),
          kind INT,
          request_id BIGINT NOT NULL,
          payload TEXT NOT NULL,
          sequence INT,
          acked BIT NOT NULL DEFAULT 0,
          CONSTRAINT ${sql(repliesTable + "_one_exit")} UNIQUE (request_id, kind),
          CONSTRAINT ${sql(repliesTable + "_sequence")} UNIQUE (request_id, sequence),
          FOREIGN KEY (request_id) REFERENCES ${messagesTableSql} (id) ON DELETE CASCADE
        )
      `,
    mysql: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${repliesTableSql} (
          id BIGINT NOT NULL,
          rowid BIGINT AUTO_INCREMENT PRIMARY KEY,
          kind INT,
          request_id BIGINT NOT NULL,
          payload TEXT NOT NULL,
          sequence INT,
          acked BOOLEAN NOT NULL DEFAULT FALSE,
          UNIQUE (id),
          UNIQUE (request_id, kind),
          UNIQUE (request_id, sequence),
          FOREIGN KEY (request_id) REFERENCES ${messagesTableSql} (id) ON DELETE CASCADE
        )
      `,
    pg: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${repliesTableSql} (
          id BIGINT PRIMARY KEY,
          rowid BIGSERIAL,
          kind INT,
          request_id BIGINT NOT NULL,
          payload TEXT NOT NULL,
          sequence INT,
          acked BOOLEAN NOT NULL DEFAULT FALSE,
          UNIQUE (request_id, kind),
          UNIQUE (request_id, sequence),
          FOREIGN KEY (request_id) REFERENCES ${messagesTableSql} (id) ON DELETE CASCADE
        )
      `,
    orElse: () =>
      // sqlite
      sql`
        CREATE TABLE IF NOT EXISTS ${repliesTableSql} (
          id INTEGER PRIMARY KEY,
          kind INTEGER,
          request_id INTEGER NOT NULL,
          payload TEXT NOT NULL,
          sequence INTEGER,
          acked BOOLEAN NOT NULL DEFAULT FALSE,
          UNIQUE (request_id, kind),
          UNIQUE (request_id, sequence),
          FOREIGN KEY (request_id) REFERENCES ${messagesTableSql} (id) ON DELETE CASCADE
        )
      `
  })

  // Add reply indexes optimized for request_id lookups
  const replyLookupIndex = `${repliesTable}_request_lookup_idx`
  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = ${replyLookupIndex})
        CREATE INDEX ${sql(replyLookupIndex)}
        ON ${repliesTableSql} (request_id, kind, acked);
      `,
    mysql: () =>
      sql`
        CREATE INDEX ${sql(replyLookupIndex)}
        ON ${repliesTableSql} (request_id, kind, acked);
      `.unprepared.pipe(Effect.ignore),
    pg: () =>
      sql`
        CREATE INDEX IF NOT EXISTS ${sql(replyLookupIndex)}
        ON ${repliesTableSql} (request_id, kind, acked);
`.pipe(
        Effect.tapDefect((error) =>
          Effect.annotateLogs(Effect.logDebug("Failed to create indexes", error), {
            package: "@effect/cluster",
            module: "SqlMessageStorage"
          })
        ),
        Effect.retry({
          schedule: Schedule.spaced(1000)
        })
      ),
    orElse: () =>
      // sqlite
      sql`
        CREATE INDEX IF NOT EXISTS ${sql(replyLookupIndex)}
        ON ${repliesTableSql} (request_id, kind, acked);
      `
  })

  const envelopeToRow = (
    envelope: Envelope.Envelope.Encoded,
    message_id: string | null,
    deliver_at: number | null
  ): MessageRow => {
    switch (envelope._tag) {
      case "Request":
        return {
          id: envelope.requestId,
          message_id,
          shard_id: envelope.address.shardId,
          entity_type: envelope.address.entityType,
          entity_id: envelope.address.entityId,
          kind: messageKind.Request,
          tag: envelope.tag,
          payload: JSON.stringify(envelope.payload),
          headers: JSON.stringify(envelope.headers),
          trace_id: envelope.traceId,
          span_id: envelope.spanId,
          sampled: supportsBooleans ? envelope.sampled : envelope.sampled ? 1 : 0,
          request_id: envelope.requestId,
          reply_id: null,
          deliver_at
        }
      case "AckChunk":
        return {
          id: envelope.id,
          message_id,
          shard_id: envelope.address.shardId,
          entity_type: envelope.address.entityType,
          entity_id: envelope.address.entityId,
          kind: messageKind.AckChunk,
          tag: null,
          payload: null,
          headers: null,
          trace_id: null,
          span_id: null,
          sampled: null,
          request_id: envelope.requestId,
          reply_id: envelope.replyId,
          deliver_at
        }
      case "Interrupt":
        return {
          id: envelope.id,
          message_id,
          shard_id: envelope.address.shardId,
          entity_type: envelope.address.entityType,
          entity_id: envelope.address.entityId,
          kind: messageKind.Interrupt,
          payload: null,
          tag: null,
          headers: null,
          trace_id: null,
          span_id: null,
          sampled: null,
          request_id: envelope.requestId,
          reply_id: null,
          deliver_at
        }
    }
  }

  const replyToRow = (reply: Reply.ReplyEncoded<any>): ReplyRow => ({
    id: reply.id,
    kind: replyKind[reply._tag],
    request_id: reply.requestId,
    payload: reply._tag === "WithExit" ? JSON.stringify(reply.exit) : JSON.stringify(reply.values),
    sequence: reply._tag === "Chunk" ? reply.sequence : null
  })

  const supportsBooleans = sql.onDialectOrElse({
    mssql: () => false,
    sqlite: () => false,
    orElse: () => true
  })

  const messageFromRow = (row: MessageRow & ReplyJoinRow): {
    readonly envelope: Envelope.Envelope.Encoded
    readonly lastSentReply: Option.Option<Reply.ReplyEncoded<any>>
  } => {
    switch (Number(row.kind) as 0 | 1 | 2) {
      case 0:
        return {
          envelope: {
            _tag: "Request",
            requestId: String(row.id),
            address: {
              shardId: Number(row.shard_id),
              entityType: row.entity_type,
              entityId: row.entity_id
            },
            tag: row.tag!,
            payload: JSON.parse(row.payload!),
            headers: JSON.parse(row.headers!),
            traceId: row.trace_id!,
            spanId: row.span_id!,
            sampled: !!row.sampled
          },
          lastSentReply: row.reply_reply_id ?
            Option.some({
              _tag: "Chunk",
              id: String(row.reply_reply_id),
              requestId: String(row.request_id),
              sequence: Number(row.reply_sequence!),
              values: JSON.parse(row.reply_payload!)
            } as any) :
            Option.none()
        }
      case 1:
        return {
          envelope: {
            _tag: "AckChunk",
            id: String(row.id),
            requestId: String(row.request_id!),
            replyId: String(row.reply_id!),
            address: {
              shardId: Number(row.shard_id),
              entityType: row.entity_type,
              entityId: row.entity_id
            }
          },
          lastSentReply: Option.none()
        }
      case 2:
        return {
          envelope: {
            _tag: "Interrupt",
            id: String(row.id),
            requestId: String(row.request_id!),
            address: {
              shardId: Number(row.shard_id),
              entityType: row.entity_type,
              entityId: row.entity_id
            }
          },
          lastSentReply: Option.none()
        }
    }
  }

  const sqlFalse = sql.literal(supportsBooleans ? "FALSE" : "0")
  const sqlTrue = sql.literal(supportsBooleans ? "TRUE" : "1")

  const insertEnvelope: (
    row: MessageRow,
    message_id: string
  ) => Effect.Effect<ReadonlyArray<Row>, SqlError> = sql.onDialectOrElse({
    pg: () => (row, message_id) =>
      sql`
        WITH inserted AS (
          INSERT INTO ${messagesTableSql} ${sql.insert(row)}
          ON CONFLICT (message_id) DO NOTHING
          RETURNING id
        ),
        existing AS (
          SELECT m.id, r.id as reply_id, r.kind as reply_kind, r.payload as reply_payload, r.sequence as reply_sequence
          FROM ${messagesTableSql} m
          LEFT JOIN ${repliesTableSql} r ON r.id = m.last_reply_id
          WHERE m.message_id = ${message_id}
          AND NOT EXISTS (SELECT 1 FROM inserted)
        )
        SELECT * FROM existing
      `,
    mysql: () => (row, message_id) =>
      sql`
        SELECT m.id, r.id as reply_id, r.kind as reply_kind, r.payload as reply_payload, r.sequence as reply_sequence
        FROM ${messagesTableSql} m
        LEFT JOIN ${repliesTableSql} r ON r.id = m.last_reply_id
        WHERE m.message_id = ${message_id};
        INSERT INTO ${messagesTableSql} ${sql.insert(row)}
        ON DUPLICATE KEY UPDATE id = id;
      `.unprepared.pipe(
        // we need 2 queries for mysql, so we need to run them in a
        // transaction with retries
        sql.withTransaction,
        Effect.retry({ times: 3 }),
        Effect.map(([rows]) => rows as any as ReadonlyArray<Row>)
      ),
    mssql: () => (row, message_id) =>
      sql`
        MERGE ${messagesTableSql} WITH (HOLDLOCK) AS target
        USING (SELECT ${message_id} as message_id) AS source
        ON target.message_id = source.message_id
        WHEN NOT MATCHED THEN
          INSERT ${sql.insert(row)}
        OUTPUT
          inserted.id,
          CASE
            WHEN inserted.id IS NULL THEN (
              SELECT r.id, r.kind, r.payload
              FROM ${repliesTableSql} r
              WHERE r.id = target.last_reply_id
            )
          END as reply_id,
          CASE
            WHEN inserted.id IS NULL THEN (
              SELECT r.kind
              FROM ${repliesTableSql} r
              WHERE r.id = target.last_reply_id
            )
          END as reply_kind,
          CASE
            WHEN inserted.id IS NULL THEN (
              SELECT r.payload
              FROM ${repliesTableSql} r
              WHERE r.id = target.last_reply_id
            )
          END as reply_payload,
          CASE
            WHEN inserted.id IS NULL THEN (
              SELECT r.sequence
              FROM ${repliesTableSql} r
              WHERE r.id = target.last_reply_id
            )
          END as reply_sequence;
      `,
    orElse: () => (row, message_id) =>
      sql`
        SELECT m.id, r.id as reply_id, r.kind as reply_kind, r.payload as reply_payload, r.sequence as reply_sequence
        FROM ${messagesTableSql} m
        LEFT JOIN ${repliesTableSql} r ON r.id = m.last_reply_id
        WHERE m.message_id = ${message_id}
      `.pipe(
        Effect.tap(sql`INSERT OR IGNORE INTO ${messagesTableSql} ${sql.insert(row)}`),
        sql.withTransaction,
        Effect.retry({ times: 3 })
      )
  })

  const fiveMinutesAgo = sql.onDialectOrElse({
    mssql: () => sql.literal(`DATEADD(MINUTE, -5, GETDATE())`),
    mysql: () => sql.literal(`NOW() - INTERVAL 5 MINUTE`),
    pg: () => sql.literal(`NOW() - INTERVAL '5 minutes'`),
    orElse: () => sql.literal(`DATETIME('now', '-5 minute')`)
  })
  const sqlNowString = sql.onDialectOrElse({
    pg: () => "NOW()",
    mysql: () => "NOW()",
    mssql: () => "GETDATE()",
    orElse: () => "CURRENT_TIMESTAMP"
  })
  const sqlNow = sql.literal(sqlNowString)

  const getUnprocessedMessages = sql.onDialectOrElse({
    pg: () => (shardIds: ReadonlyArray<number>, now: number) =>
      sql<MessageJoinRow>`
        UPDATE ${messagesTableSql} m
        SET last_read = ${sqlNow}
        FROM (
          SELECT m.*
          FROM ${messagesTableSql} m
          WHERE m.shard_id IN (${sql.literal(shardIds.map(String).join(","))})
          AND NOT EXISTS (
            SELECT 1 FROM ${repliesTableSql}
            WHERE request_id = m.request_id
            AND (kind = ${replyKindWithExit} OR acked = ${sqlFalse})
          )
          AND m.processed = ${sqlFalse}
          AND (m.last_read IS NULL OR m.last_read < ${fiveMinutesAgo})
          AND (m.deliver_at IS NULL OR m.deliver_at <= ${sql.literal(String(now))})
          ORDER BY m.rowid ASC
          FOR UPDATE
        ) AS ids
        LEFT JOIN ${repliesTableSql} r ON r.id = ids.last_reply_id
        WHERE m.id = ids.id
        RETURNING ids.*, r.id as reply_reply_id, r.kind as reply_kind, r.payload as reply_payload, r.sequence as reply_sequence
      `,
    orElse: () => (shardIds: ReadonlyArray<number>, now: number) =>
      sql<MessageJoinRow>`
        SELECT m.*, r.id as reply_reply_id, r.kind as reply_kind, r.payload as reply_payload, r.sequence as reply_sequence
        FROM ${messagesTableSql} m
        LEFT JOIN ${repliesTableSql} r ON r.id = m.last_reply_id
        WHERE m.shard_id IN (${sql.literal(shardIds.map(String).join(","))})
        AND NOT EXISTS (
          SELECT 1 FROM ${repliesTableSql}
          WHERE request_id = m.request_id
          AND (kind = ${replyKindWithExit} OR acked = ${sqlFalse})
        )
        AND processed = ${sqlFalse}
        AND (m.last_read IS NULL OR m.last_read < ${fiveMinutesAgo})
        AND (m.deliver_at IS NULL OR m.deliver_at <= ${sql.literal(String(now))})
        ORDER BY m.rowid ASC
      `.unprepared.pipe(
        Effect.tap((rows) => {
          if (rows.length === 0) {
            return Effect.void
          }
          return sql`
            UPDATE ${messagesTableSql}
            SET last_read = ${sqlNow}
            WHERE id IN (${sql.literal(rows.map((row) => row.id).join(","))})
          `.unprepared
        }),
        sql.withTransaction
      )
  })

  return yield* MessageStorage.makeEncoded({
    saveEnvelope: ({ deliverAt, envelope, primaryKey }) =>
      Effect.suspend(() => {
        const row = envelopeToRow(envelope, primaryKey, deliverAt)
        let insert = primaryKey
          ? insertEnvelope(row, primaryKey)
          : Effect.as(sql`INSERT INTO ${messagesTableSql} ${sql.insert(row)}`.unprepared, [])
        if (envelope._tag === "AckChunk") {
          insert = sql`UPDATE ${repliesTableSql} SET acked = ${sqlTrue} WHERE id = ${envelope.replyId}`.pipe(
            Effect.andThen(
              sql`UPDATE ${messagesTableSql} SET processed = ${sqlTrue} WHERE processed = ${sqlFalse} AND request_id = ${envelope.requestId} AND kind = ${messageKindAckChunk}`
            ),
            Effect.andThen(insert),
            sql.withTransaction
          )
        }
        return insert.pipe(
          Effect.map((rows) => {
            if (rows.length === 0) {
              return SaveResultEncoded.Success()
            }
            const row = rows[0]
            return SaveResultEncoded.Duplicate({
              originalId: Snowflake.Snowflake(row.id as any),
              lastReceivedReply: row.reply_id ?
                Option.some({
                  id: String(row.reply_id),
                  requestId: String(row.id),
                  _tag: row.reply_kind === replyKind.WithExit ? "WithExit" : "Chunk",
                  ...(row.reply_kind === replyKind.WithExit
                    ? { exit: JSON.parse(row.reply_payload as string) }
                    : {
                      sequence: Number(row.reply_sequence),
                      values: JSON.parse(row.reply_payload as string)
                    })
                } as any) :
                Option.none()
            })
          })
        )
      }).pipe(
        Effect.provideService(SqlClient.SafeIntegers, true),
        PersistenceError.refail
      ),

    saveReply: (reply) =>
      Effect.suspend(() => {
        const row = replyToRow(reply)
        const update = reply._tag === "Chunk" ?
          sql`UPDATE ${messagesTableSql} SET last_reply_id = ${reply.id} WHERE id = ${reply.requestId}` :
          sql`UPDATE ${messagesTableSql} SET processed = ${sqlTrue}, last_reply_id = NULL WHERE request_id = ${reply.requestId}`
        return update.unprepared.pipe(
          Effect.andThen(sql`INSERT INTO ${repliesTableSql} ${sql.insert(row)}`),
          sql.withTransaction
        )
      }).pipe(
        Effect.asVoid,
        PersistenceError.refail
      ),

    repliesFor: (requestIds) =>
      // replies where:
      // - the request is in the list
      // - the kind is WithExit
      // - or the kind is Chunk and has not been acked yet
      sql<ReplyRow>`
        SELECT id, kind, request_id, payload, sequence
        FROM ${repliesTableSql}
        WHERE request_id IN (${sql.literal(requestIds.join(","))})
        AND (
          kind = ${replyKindWithExit}
          OR (
            kind IS NULL
            AND acked = ${sqlFalse}
          )
        )
        ORDER BY rowid ASC
      `.unprepared.pipe(
        Effect.provideService(SqlClient.SafeIntegers, true),
        Effect.map(Arr.map((row): Reply.ReplyEncoded<any> =>
          Number(row.kind) === replyKind.WithExit ?
            ({
              _tag: "WithExit",
              id: String(row.id),
              requestId: String(row.request_id),
              exit: JSON.parse(row.payload)
            }) :
            {
              _tag: "Chunk",
              id: String(row.id),
              requestId: String(row.request_id),
              values: JSON.parse(row.payload),
              sequence: Number(row.sequence!)
            }
        )),
        PersistenceError.refail,
        withTracerDisabled
      ),

    unprocessedMessages: Effect.fnUntraced(
      function*(shardIds, now) {
        const rows = yield* getUnprocessedMessages(shardIds, now)
        if (rows.length === 0) {
          return []
        }
        const messages: Array<{
          readonly envelope: Envelope.Envelope.Encoded
          readonly lastSentReply: Option.Option<Reply.ReplyEncoded<any>>
        }> = new Array(rows.length)
        const ids = new Array<string>(rows.length)
        for (let i = 0; i < rows.length; i++) {
          messages[i] = messageFromRow(rows[i])
          ids[i] = String(rows[i].id)
        }
        return messages
      },
      Effect.provideService(SqlClient.SafeIntegers, true),
      PersistenceError.refail,
      withTracerDisabled
    ),

    unprocessedMessagesById(ids, now) {
      const idArr = Array.from(ids, (id) => String(id))
      return sql<MessageRow & ReplyJoinRow>`
        SELECT m.*, r.id as reply_id, r.kind as reply_kind, r.payload as reply_payload, r.sequence as reply_sequence
        FROM ${messagesTableSql} m
        LEFT JOIN ${repliesTableSql} r ON r.id = m.last_reply_id
        WHERE m.id IN (${sql.literal(idArr.join(","))})
        AND NOT EXISTS (
          SELECT 1 FROM ${repliesTableSql}
          WHERE request_id = m.request_id
          AND (kind = ${replyKindWithExit} OR acked = ${sqlFalse})
        )
        AND m.processed = ${sqlFalse}
        AND (m.deliver_at IS NULL OR m.deliver_at <= ${sql.literal(String(now))})
        ORDER BY m.rowid ASC
      `.unprepared.pipe(
        Effect.map(Arr.map(messageFromRow)),
        Effect.provideService(SqlClient.SafeIntegers, true),
        PersistenceError.refail,
        withTracerDisabled
      )
    },

    resetAddress: (address) =>
      sql`
        UPDATE ${messagesTableSql}
        SET last_read = NULL
        WHERE processed = ${sqlFalse}
        AND shard_id = ${address.shardId}
        AND entity_type = ${address.entityType}
        AND entity_id = ${address.entityId}
      `.pipe(
        Effect.asVoid,
        PersistenceError.refail,
        withTracerDisabled
      ),

    resetShards: (shardIds) =>
      sql`
        UPDATE ${messagesTableSql}
        SET last_read = NULL
        WHERE processed = ${sqlFalse}
        AND shard_id IN (${sql.literal(shardIds.join(","))})
      `.pipe(
        Effect.asVoid,
        PersistenceError.refail,
        withTracerDisabled
      )
  })
}, withTracerDisabled)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  MessageStorage.MessageStorage,
  SqlError,
  SqlClient.SqlClient | ShardingConfig
> = Layer.scoped(MessageStorage.MessageStorage, make()).pipe(
  Layer.provide(Snowflake.layerGenerator)
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWith = (options: {
  readonly prefix?: string | undefined
  readonly replyPollInterval?: DurationInput | undefined
}): Layer.Layer<MessageStorage.MessageStorage, SqlError, SqlClient.SqlClient | ShardingConfig> =>
  Layer.scoped(MessageStorage.MessageStorage, make(options)).pipe(
    Layer.provide(Snowflake.layerGenerator)
  )

// -------------------------------------------------------------------------------------------------
// internal
// -------------------------------------------------------------------------------------------------

const messageKind = {
  "Request": 0,
  "AckChunk": 1,
  "Interrupt": 2
} as const satisfies Record<Envelope.Envelope.Any["_tag"], number>

const replyKind = {
  "WithExit": 0,
  "Chunk": null
} as const satisfies Record<Reply.Reply<any>["_tag"], number | null>

type MessageRow = {
  readonly id: string | bigint
  readonly message_id: string | null
  readonly shard_id: number | bigint
  readonly entity_type: string
  readonly entity_id: string
  readonly kind: 0 | 1 | 2 | 0n | 1n | 2n
  readonly tag: string | null
  readonly payload: string | null
  readonly headers: string | null
  readonly trace_id: string | null
  readonly span_id: string | null
  readonly sampled: boolean | number | bigint | null
  readonly request_id: string | bigint | null
  readonly reply_id: string | bigint | null
  readonly deliver_at: number | bigint | null
}

type ReplyRow = {
  readonly id: string | bigint
  readonly kind: 0 | null | 0n
  readonly request_id: string | bigint
  readonly payload: string
  readonly sequence: number | bigint | null
}

type ReplyJoinRow = {
  readonly reply_reply_id: string | bigint | null
  readonly reply_payload: string | null
  readonly reply_sequence: number | bigint | null
}

type MessageJoinRow = MessageRow & ReplyJoinRow & {
  readonly sequence: number | bigint
}
