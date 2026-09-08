import { PgliteClient } from "@effect/sql-pglite"
import { assert, describe, layer } from "@effect/vitest"
import { Effect, Schedule, Schema } from "effect"
import { TestClock } from "effect/testing"
import { PersistedQueue } from "effect/unstable/persistence"
import { SqlClient } from "effect/unstable/sql"

const ClientLayer = PgliteClient.layer({})

describe("PersistedQueue SQL migrations", () => {
  layer(ClientLayer, { timeout: "30 seconds" })((it) => {
    it.effect("preserves a sub-second retry through the PostgreSQL interval branch", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const store = yield* PersistedQueue.makeStoreSql({ tableName: "pg_retry", pollInterval: 10 })
        const factory = yield* PersistedQueue.makeFactory.pipe(
          Effect.provideService(PersistedQueue.PersistedQueueStore, store)
        )
        const queue = yield* factory.make({ name: "retry", schema: Schema.Number, retrySchedule: Schedule.spaced(500) })
        yield* queue.offer(42)
        let failedAt = 0
        assert.strictEqual(
          yield* queue.take(() => {
            failedAt = Date.now()
            return Effect.fail("boom")
          }).pipe(Effect.flip),
          "boom"
        )
        const rows = yield* sql<{ delay_ms: string }>`SELECT
          EXTRACT(EPOCH FROM (visible_at - updated_at)) * 1000 AS delay_ms FROM pg_retry WHERE queue_name = 'retry'`
        assert.strictEqual(Number(rows[0].delay_ms), 500)
        const result = yield* queue.take((value, { attempts }) => Effect.succeed({ value, attempts }))
        assert.deepStrictEqual(result, { value: 42, attempts: 2 })
        assert.isAtLeast(Date.now() - failedAt, 500)
      }).pipe(TestClock.withLive), { timeout: 10_000 })

    it.effect("runs fresh-install migrations once", () =>
      Effect.gen(function*() {
        const sql = (yield* SqlClient.SqlClient).withoutTransforms()
        const tableName = "persisted_queue_migration_test"

        yield* PersistedQueue.makeStoreSql({ tableName })
        yield* PersistedQueue.makeStoreSql({ tableName })

        const migrations = yield* sql<{
          readonly migration_id: number
          readonly name: string
        }>`SELECT migration_id, name FROM ${sql(`${tableName}_migrations`)} ORDER BY migration_id`
        assert.deepStrictEqual(migrations, [
          { migration_id: 1, name: "create_table" },
          { migration_id: 2, name: "upgrade_schema" }
        ])

        const indexes = yield* sql<{ readonly indexname: string }>`
          SELECT indexname FROM pg_indexes
          WHERE tablename = ${tableName}
          ORDER BY indexname
        `
        assert.deepStrictEqual(indexes.map((row) => row.indexname), [
          `idx_${tableName}_id`,
          `idx_${tableName}_take`,
          `idx_${tableName}_update`,
          `${tableName}_pkey`
        ])
      }))
  })
})
