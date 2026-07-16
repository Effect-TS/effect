import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { MessageStorage, ShardingConfig, Snowflake, SqlMessageStorage } from "effect/unstable/cluster"
import { SqlClient } from "effect/unstable/sql"
import { MssqlContainer } from "../fixtures/mssql-utils.ts"

const storageLive = (prefix: string) =>
  SqlMessageStorage.layerWith({ prefix }).pipe(
    Layer.provideMerge(Snowflake.layerGenerator),
    Layer.provide(ShardingConfig.layerDefaults)
  )

describe("SqlMessageStorage mssql migrations", () => {
  it.layer(Layer.orDie(MssqlContainer.layerClient), {
    timeout: 120000
  })("mssql", (it) => {
    it.effect("creates filtered unique indexes on a fresh database", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        // building the storage layer runs the migrations
        yield* Effect.gen(function*() {
          yield* MessageStorage.MessageStorage
        }).pipe(Effect.provide(storageLive("fresh")))

        // rows the pre-fix constraints rejected: message_id NULL twice, chunk
        // replies with kind NULL twice, NULL payload and headers parameters
        // (the client binds NULL parameters as BIT)
        yield* sql`
          INSERT INTO fresh_messages (id, message_id, shard_id, entity_type, entity_id, kind, payload, headers, processed, request_id)
          VALUES (1, NULL, 'shard[1]', 'test', '1', 0, ${null}, ${null}, 0, 1)
        `
        yield* sql`
          INSERT INTO fresh_messages (id, message_id, shard_id, entity_type, entity_id, kind, payload, headers, processed, request_id)
          VALUES (2, NULL, 'shard[1]', 'test', '2', 0, ${null}, ${null}, 0, 2)
        `
        yield* sql`
          INSERT INTO fresh_replies (id, kind, request_id, payload, sequence, acked)
          VALUES (1, NULL, 1, '{"chunk":0}', 0, 0)
        `
        yield* sql`
          INSERT INTO fresh_replies (id, kind, request_id, payload, sequence, acked)
          VALUES (2, NULL, 1, '{"chunk":1}', 1, 0)
        `

        const uniqueConstraints = yield* sql<{ n: number }>`
          SELECT COUNT(*) AS n FROM sys.key_constraints
          WHERE type = 'UQ'
          AND parent_object_id IN (OBJECT_ID(N'fresh_messages'), OBJECT_ID(N'fresh_replies'))
        `
        assert.strictEqual(Number(uniqueConstraints[0].n), 0)

        const filteredIndexes = yield* sql<{ name: string }>`
          SELECT name FROM sys.indexes
          WHERE is_unique = 1 AND has_filter = 1
          AND (
            (object_id = OBJECT_ID(N'fresh_messages') AND name = 'fresh_messages_message_id_idx')
            OR (object_id = OBJECT_ID(N'fresh_replies') AND name IN ('fresh_replies_one_exit', 'fresh_replies_sequence'))
          )
        `
        assert.deepStrictEqual(filteredIndexes.map((row) => row.name).sort(), [
          "fresh_messages_message_id_idx",
          "fresh_replies_one_exit",
          "fresh_replies_sequence"
        ])

        const textColumns = yield* sql<{ n: number }>`
          SELECT COUNT(*) AS n FROM sys.columns
          WHERE object_id IN (OBJECT_ID(N'fresh_messages'), OBJECT_ID(N'fresh_replies'))
          AND system_type_id = TYPE_ID(N'text')
        `
        assert.strictEqual(Number(textColumns[0].n), 0)
      }), 120000)

    it.effect("converges an existing pre-fix schema and is idempotent", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        // stage the schema exactly as the pre-fix 0001 and 0002 migrations
        // left it: inline unique constraints (one anonymous), TEXT columns
        // and a migration history that ends at 0002
        yield* sql`
          CREATE TABLE upgrade_messages (
            id BIGINT PRIMARY KEY,
            rowid BIGINT IDENTITY(1,1),
            message_id VARCHAR(255),
            shard_id VARCHAR(50) NOT NULL,
            entity_type VARCHAR(150) NOT NULL,
            entity_id VARCHAR(255) NOT NULL,
            kind INT NOT NULL,
            tag VARCHAR(50),
            payload TEXT,
            headers TEXT,
            trace_id VARCHAR(32),
            span_id VARCHAR(16),
            sampled BIT,
            processed BIT NOT NULL DEFAULT 0,
            request_id BIGINT NOT NULL,
            reply_id BIGINT,
            last_reply_id BIGINT,
            last_read DATETIME,
            deliver_at BIGINT,
            UNIQUE (message_id)
          )
        `
        yield* sql`
          CREATE TABLE upgrade_replies (
            id BIGINT PRIMARY KEY,
            rowid BIGINT IDENTITY(1,1),
            kind INT,
            request_id BIGINT NOT NULL,
            payload TEXT NOT NULL,
            sequence INT,
            acked BIT NOT NULL DEFAULT 0,
            CONSTRAINT upgrade_replies_one_exit UNIQUE (request_id, kind),
            CONSTRAINT upgrade_replies_sequence UNIQUE (request_id, sequence)
          )
        `
        yield* sql`
          CREATE TABLE upgrade_migrations (
            migration_id INT NOT NULL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT GETDATE()
          )
        `
        yield* sql`
          INSERT INTO upgrade_migrations (migration_id, name)
          VALUES (1, 'create_tables'), (2, 'entity_type_size')
        `
        // pre-existing data that must survive the TEXT to NVARCHAR(MAX) conversion
        yield* sql`
          INSERT INTO upgrade_messages (id, message_id, shard_id, entity_type, entity_id, kind, tag, payload, headers, processed, request_id)
          VALUES (1, NULL, 'legacy[1]', 'test', '1', 0, 'GetUser', '{"id":1}', '{}', 1, 1)
        `
        yield* sql`
          INSERT INTO upgrade_replies (id, kind, request_id, payload, sequence, acked)
          VALUES (1, 0, 1, '{"legacy":true}', NULL, 1)
        `

        // building the layer runs the remaining 0003 migration
        yield* Effect.gen(function*() {
          yield* MessageStorage.MessageStorage
        }).pipe(Effect.provide(storageLive("upgrade")))

        // rows the pre-fix constraints rejected: message_id NULL twice, chunk
        // replies with kind NULL twice, NULL payload and headers parameters
        // (the client binds NULL parameters as BIT, which TEXT columns reject)
        yield* sql`
          INSERT INTO upgrade_messages (id, message_id, shard_id, entity_type, entity_id, kind, payload, headers, processed, request_id)
          VALUES (10, NULL, 'legacy[1]', 'test', '10', 0, ${null}, ${null}, 0, 10)
        `
        yield* sql`
          INSERT INTO upgrade_messages (id, message_id, shard_id, entity_type, entity_id, kind, payload, headers, processed, request_id)
          VALUES (11, NULL, 'legacy[1]', 'test', '11', 0, ${null}, ${null}, 0, 11)
        `
        yield* sql`
          INSERT INTO upgrade_replies (id, kind, request_id, payload, sequence, acked)
          VALUES (10, NULL, 10, '{"chunk":0}', 0, 0)
        `
        yield* sql`
          INSERT INTO upgrade_replies (id, kind, request_id, payload, sequence, acked)
          VALUES (11, NULL, 10, '{"chunk":1}', 1, 0)
        `

        // the replacement indexes still enforce uniqueness of non-NULL keys
        yield* sql`
          INSERT INTO upgrade_messages (id, message_id, shard_id, entity_type, entity_id, kind, processed, request_id)
          VALUES (90, 'dup-key', 'legacy[1]', 'test', '1', 0, 1, 90)
        `
        const messageIdViolation = yield* Effect.flip(sql`
          INSERT INTO upgrade_messages (id, message_id, shard_id, entity_type, entity_id, kind, processed, request_id)
          VALUES (91, 'dup-key', 'legacy[1]', 'test', '1', 0, 1, 91)
        `)
        assert.strictEqual(messageIdViolation._tag, "SqlError")
        const exitViolation = yield* Effect.flip(sql`
          INSERT INTO upgrade_replies (id, kind, request_id, payload, sequence, acked)
          VALUES (92, 0, 1, '{}', NULL, 1)
        `)
        assert.strictEqual(exitViolation._tag, "SqlError")
        // duplicate non-NULL chunk sequence for the same request
        yield* sql`
          INSERT INTO upgrade_replies (id, kind, request_id, payload, sequence, acked)
          VALUES (93, NULL, 90, '{"chunk":true}', 5, 0)
        `
        const sequenceViolation = yield* Effect.flip(sql`
          INSERT INTO upgrade_replies (id, kind, request_id, payload, sequence, acked)
          VALUES (94, NULL, 90, '{"chunk":true}', 5, 0)
        `)
        assert.strictEqual(sequenceViolation._tag, "SqlError")

        const assertConverged = Effect.gen(function*() {
          const uniqueConstraints = yield* sql<{ n: number }>`
            SELECT COUNT(*) AS n FROM sys.key_constraints
            WHERE type = 'UQ'
            AND parent_object_id IN (OBJECT_ID(N'upgrade_messages'), OBJECT_ID(N'upgrade_replies'))
          `
          assert.strictEqual(Number(uniqueConstraints[0].n), 0)

          const filteredIndexes = yield* sql<{ n: number }>`
            SELECT COUNT(*) AS n FROM sys.indexes
            WHERE is_unique = 1 AND has_filter = 1
            AND (
              (object_id = OBJECT_ID(N'upgrade_messages') AND name = 'upgrade_messages_message_id_idx')
              OR (object_id = OBJECT_ID(N'upgrade_replies') AND name IN ('upgrade_replies_one_exit', 'upgrade_replies_sequence'))
            )
          `
          assert.strictEqual(Number(filteredIndexes[0].n), 3)

          const textColumns = yield* sql<{ n: number }>`
            SELECT COUNT(*) AS n FROM sys.columns
            WHERE object_id IN (OBJECT_ID(N'upgrade_messages'), OBJECT_ID(N'upgrade_replies'))
            AND system_type_id = TYPE_ID(N'text')
          `
          assert.strictEqual(Number(textColumns[0].n), 0)
        })
        yield* assertConverged

        // pre-existing data survived the column conversion
        const messages = yield* sql<{ payload: string; headers: string }>`
          SELECT payload, headers FROM upgrade_messages WHERE id = 1
        `
        assert.strictEqual(messages[0].payload, `{"id":1}`)
        assert.strictEqual(messages[0].headers, "{}")
        const replies = yield* sql<{ payload: string }>`
          SELECT payload FROM upgrade_replies WHERE id = 1
        `
        assert.strictEqual(replies[0].payload, `{"legacy":true}`)

        // re-running the migration against the converged schema is harmless
        yield* sql`DELETE FROM upgrade_migrations WHERE migration_id = 3`
        yield* Effect.gen(function*() {
          yield* MessageStorage.MessageStorage
        }).pipe(Effect.provide(storageLive("upgrade")))
        yield* assertConverged
      }), 120000)
  })
})
