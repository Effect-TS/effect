import { MysqlClient } from "@effect/sql-mysql2"
import { assert, it } from "@effect/vitest"
import { Effect, Latch, Layer, Redacted, Schedule, Schema } from "effect"
import { TestClock } from "effect/testing"
import { PersistedQueue } from "effect/unstable/persistence"
import { Reactivity } from "effect/unstable/reactivity"
import { SqlClient, Statement } from "effect/unstable/sql"
import { MysqlContainer } from "./utils.ts"

// SET timestamp is session-local. One connection ensures the queue's SQL and
// the assertions use the same frozen database clock, including background polls.
const client = Layer.unwrap(Effect.gen(function*() {
  const container = yield* MysqlContainer
  return MysqlClient.layer({
    url: Redacted.make(container.getConnectionUri()),
    maxConnections: 1
  })
})).pipe(Layer.provide(MysqlContainer.layer))

const layer = PersistedQueue.layer.pipe(
  Layer.provideMerge(PersistedQueue.layerStoreSql({ tableName: "retry_precision" })),
  Layer.provideMerge(client)
)

it.layer(layer, { timeout: "60 seconds", concurrent: false })("PersistedQueue MySQL retry precision", (it) => {
  for (const legacy of [false, true]) {
    it.effect(
      legacy ? "concurrent startups perform only one precision ALTER" : "correct tables skip precision ALTER",
      () =>
        Effect.gen(function*() {
          const sql = yield* MysqlClient.MysqlClient
          const tableName = legacy ? "concurrent_precision" : "correct_precision"
          yield* sql`CREATE TABLE ${sql(tableName)} LIKE retry_precision`
          yield* sql`CREATE TABLE ${sql(`${tableName}_migrations`)} LIKE retry_precision_migrations`
          yield* sql`INSERT INTO ${sql(`${tableName}_migrations`)} SELECT * FROM retry_precision_migrations`
          if (legacy) {
            yield* sql`ALTER TABLE ${sql(tableName)} MODIFY visible_at DATETIME NOT NULL`
          }
          const clients = yield* Effect.forEach(
            [0, 1],
            () => MysqlClient.make(sql.config).pipe(Effect.provide(Reactivity.layer))
          )
          const attempts: Array<string> = []
          const observe: Statement.Transformer = (statement) => {
            const [query] = statement.compile()
            if (!/^\s*ALTER TABLE\b/i.test(query) || !query.includes(tableName)) return Effect.succeed(statement)
            attempts.push(query)
            // Hold the first ALTER before execution to let the other independent
            // startup read the old schema. A coordinated implementation may block
            // that startup before its check, so this delay must not await it.
            return Effect.as(Effect.sleep(250), statement)
          }
          yield* Effect.forEach(clients, (client) =>
            PersistedQueue.makeStoreSql({ tableName }).pipe(
              Effect.provideService(SqlClient.SqlClient, client),
              Effect.provideService(Statement.CurrentTransformer, observe),
              Effect.scoped
            ), { concurrency: 2 })
          const columns = yield* sql<{ count: number }>`SELECT COUNT(*) AS count FROM information_schema.columns
          WHERE table_schema = DATABASE() AND table_name = ${tableName}
          AND column_name IN ('visible_at', 'acquired_at', 'created_at', 'updated_at') AND datetime_precision = 6`
          assert.strictEqual(Number(columns[0].count), 4)
          assert.strictEqual(attempts.length, legacy ? 1 : 0, JSON.stringify(attempts))
        }).pipe(TestClock.withLive),
      { timeout: 10_000 }
    )
  }

  it.effect("cleanup uses the default 30-day TTL without deleting newer or pending rows", () =>
    Effect.gen(function*() {
      const sql = yield* MysqlClient.MysqlClient
      const store = yield* PersistedQueue.makeStoreSql({ tableName: "cleanup_month" })
      yield* sql`SET timestamp = 1800000000.95`
      yield* Effect.addFinalizer(() => sql`SET timestamp = DEFAULT`.pipe(Effect.orDie))
      for (
        const [id, state, days] of [
          ["old", "completed", 31],
          ["boundary", "completed", 30],
          ["new", "completed", 29],
          ["pending", "pending", 31],
          ["failed", "failed", 31]
        ] as const
      ) {
        yield* sql`INSERT INTO cleanup_month
          (id, queue_name, element, state, attempts, visible_at, created_at, updated_at)
          VALUES (${id}, 'cleanup', '42', ${state}, 1, NOW(6), NOW(6), DATE_SUB(NOW(6), INTERVAL ${days} DAY))`
      }
      const completed = Latch.makeUnsafe()
      // Observe successful completion so layerCleanup's warning handler cannot
      // hide a rejected large negative MICROSECOND interval from this test.
      yield* Layer.build(PersistedQueue.layerCleanup()).pipe(
        Effect.provideService(PersistedQueue.PersistedQueueStore, {
          ...store,
          cleanup: (options) => store.cleanup(options).pipe(Effect.tap(() => completed.open))
        })
      )
      yield* completed.await.pipe(Effect.timeout("5 seconds"))
      assert.deepStrictEqual(yield* sql`SELECT id FROM cleanup_month ORDER BY id`, [
        { id: "failed" },
        { id: "new" },
        { id: "pending" }
      ])
    }).pipe(TestClock.withLive), { timeout: 10_000 })

  for (const column of ["visible_at", "acquired_at", "created_at", "updated_at"]) {
    it.effect(`upgrades ${column} when it was left below microsecond precision`, () =>
      Effect.gen(function*() {
        const sql = yield* MysqlClient.MysqlClient
        const tableName = `partial_${column}`
        yield* sql`CREATE TABLE ${sql(tableName)} LIKE retry_precision`
        yield* sql`ALTER TABLE ${sql(tableName)} MODIFY ${sql(column)} DATETIME(3) ${
          sql.literal(column === "acquired_at" ? "NULL" : "NOT NULL")
        }`
        yield* sql`CREATE TABLE ${sql(`${tableName}_migrations`)} LIKE retry_precision_migrations`
        yield* sql`INSERT INTO ${sql(`${tableName}_migrations`)} SELECT * FROM retry_precision_migrations`
        yield* PersistedQueue.makeStoreSql({ tableName })
        const columns = yield* sql<{ fractional_digits: number }>`SELECT DATETIME_PRECISION AS fractional_digits
          FROM information_schema.columns WHERE table_schema = DATABASE()
          AND table_name = ${tableName} AND column_name = ${column}`
        assert.strictEqual(Number(columns[0].fractional_digits), 6)
      }))
  }

  it.effect("upgrades an existing queue once and preserves its rows and indexes", () =>
    Effect.gen(function*() {
      const sql = yield* MysqlClient.MysqlClient
      const tableName = "existing_queue"
      // Schema and migration history from before DATETIME(6), built
      // independently of the current migration implementation.
      yield* sql`CREATE TABLE existing_queue (
        sequence BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id VARCHAR(255) NOT NULL,
        queue_name VARCHAR(255) NOT NULL,
        element MEDIUMTEXT NOT NULL,
        state VARCHAR(10) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        last_failure MEDIUMTEXT NULL,
        visible_at DATETIME NOT NULL,
        acquired_at DATETIME NULL,
        acquired_by VARCHAR(36) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE INDEX idx_existing_queue_id (id, queue_name),
        INDEX idx_existing_queue_take (queue_name, state, visible_at),
        INDEX idx_existing_queue_update (sequence, acquired_by)
      )`
      yield* sql`CREATE TABLE existing_queue_migrations (
        migration_id INTEGER UNSIGNED NOT NULL PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        name VARCHAR(255) NOT NULL
      )`
      yield* sql`INSERT INTO existing_queue_migrations (migration_id, name)
        VALUES (1, 'create_table'), (2, 'upgrade_schema')`
      yield* sql`INSERT INTO existing_queue
        (id, queue_name, element, state, attempts, last_failure, visible_at, acquired_at, acquired_by, created_at, updated_at)
        VALUES
        ('pending', 'upgrade', '42', 'pending', 0, NULL, '2026-01-01', NULL, NULL, '2026-01-01', '2026-01-01'),
        ('completed', 'upgrade', '43', 'completed', 1, NULL, '2026-01-01', NULL, NULL, '2026-01-01', '2026-01-01'),
        ('failed', 'upgrade', '44', 'failed', 3, 'boom', '2026-01-01', NULL, NULL, '2026-01-01', '2026-01-01'),
        ('acquired', 'other', '45', 'pending', 1, NULL, '2026-01-01', '2026-01-01', 'worker', '2026-01-01', '2026-01-01')`
      const before = yield* sql`SELECT * FROM existing_queue ORDER BY sequence`
      const indexes = sql`SELECT index_name, column_name, seq_in_index, non_unique
        FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'existing_queue'
        ORDER BY index_name, seq_in_index`
      const indexesBefore = yield* indexes

      yield* PersistedQueue.makeStoreSql({ tableName }).pipe(Effect.scoped)
      const migrations = sql`SELECT * FROM existing_queue_migrations ORDER BY migration_id`
      const migrated = yield* migrations
      assert.deepStrictEqual(migrated.map((row) => [row.migration_id, row.name]), [
        [1, "create_table"],
        [2, "upgrade_schema"]
      ])
      const columns = yield* sql<{ column_name: string; datetime_precision: number; is_nullable: string }>`
        SELECT COLUMN_NAME AS column_name, DATETIME_PRECISION AS datetime_precision, IS_NULLABLE AS is_nullable
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'existing_queue' AND data_type = 'datetime'
        ORDER BY column_name`
      assert.deepStrictEqual(columns, [
        { column_name: "acquired_at", datetime_precision: 6, is_nullable: "YES" },
        { column_name: "created_at", datetime_precision: 6, is_nullable: "NO" },
        { column_name: "updated_at", datetime_precision: 6, is_nullable: "NO" },
        { column_name: "visible_at", datetime_precision: 6, is_nullable: "NO" }
      ])

      // Reopening must keep the migration history, data, and indexes intact.
      const store = yield* PersistedQueue.makeStoreSql({ tableName })
      assert.deepStrictEqual(yield* migrations, migrated)
      assert.deepStrictEqual(yield* sql`SELECT * FROM existing_queue ORDER BY sequence`, before)
      assert.deepStrictEqual(yield* indexes, indexesBefore)

      const factory = yield* PersistedQueue.makeFactory.pipe(
        Effect.provideService(PersistedQueue.PersistedQueueStore, store)
      )
      const queue = yield* factory.make({ name: "upgrade", schema: Schema.Number, retrySchedule: Schedule.spaced(500) })
      yield* sql`SET timestamp = 1800000000.95`
      yield* Effect.addFinalizer(() => sql`SET timestamp = DEFAULT`.pipe(Effect.orDie))
      assert.strictEqual(
        yield* queue.take((value) => {
          assert.strictEqual(value, 42)
          return Effect.fail("retry")
        }).pipe(Effect.flip),
        "retry"
      )
      const rows = yield* sql<{ delay_us: number }>`
        SELECT TIMESTAMPDIFF(MICROSECOND, NOW(6), visible_at) AS delay_us
        FROM existing_queue WHERE id = 'pending'`
      assert.strictEqual(Number(rows[0].delay_us), 500_000)
      yield* sql`SET timestamp = 1800000002`
      assert.strictEqual(yield* queue.take((_, { attempts }) => Effect.succeed(attempts)), 2)
    }), { timeout: 10_000 })

  for (const delay of [0, 0.5, 500, 2500]) {
    for (const phase of [0, 250, 750, 950]) {
      it.effect(`preserves a ${delay} ms retry at second phase ${phase} ms`, () =>
        Effect.gen(function*() {
          const sql = yield* MysqlClient.MysqlClient
          const timestamp = 1_800_000_000 + phase / 1000
          yield* sql`SET timestamp = ${timestamp}`
          yield* Effect.addFinalizer(() => sql`SET timestamp = DEFAULT`.pipe(Effect.orDie))
          const clock = yield* sql<{ phase: number }>`SELECT MICROSECOND(NOW(6)) AS phase`
          assert.strictEqual(clock[0].phase, phase * 1000)

          const queue = yield* PersistedQueue.make({
            name: `retry-precision-${delay}-${phase}`,
            schema: Schema.Number,
            retrySchedule: Schedule.spaced(delay)
          })
          yield* queue.offer(42)
          assert.strictEqual(yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip), "boom")

          // Measure the persisted deadline against the frozen database clock.
          // Delays round up to whole milliseconds, never to whole seconds.
          // Freezing MySQL time avoids TestClock/live-clock scheduling races.
          const rows = yield* sql<{ delay_us: number; attempts: number; state: string }>`
            SELECT TIMESTAMPDIFF(MICROSECOND, NOW(6), visible_at) AS delay_us, attempts, state
            FROM retry_precision WHERE queue_name = ${`retry-precision-${delay}-${phase}`}
          `
          assert.strictEqual(rows.length, 1)
          assert.strictEqual(rows[0].attempts, 1)
          assert.strictEqual(rows[0].state, "pending")
          assert.strictEqual(Number(rows[0].delay_us), Math.ceil(delay) * 1000)

          if (delay > 0) {
            // Let MySQL compute the boundary from its stored deadline, avoiding
            // floating-point conversion of epoch seconds in JavaScript.
            const boundary = yield* sql<{ timestamp: string }>`SELECT
              CAST(UNIX_TIMESTAMP(visible_at) - 0.000001 AS CHAR) AS timestamp
              FROM retry_precision WHERE queue_name = ${`retry-precision-${delay}-${phase}`}`
            yield* sql`SET timestamp = ${boundary[0].timestamp}`
            const remaining = yield* sql<{ microseconds: number }>`SELECT
              TIMESTAMPDIFF(MICROSECOND, NOW(6), visible_at) AS microseconds
              FROM retry_precision WHERE queue_name = ${`retry-precision-${delay}-${phase}`}`
            assert.strictEqual(Number(remaining[0].microseconds), 1)
            const eligible = yield* sql`SELECT sequence FROM retry_precision
              WHERE queue_name = ${`retry-precision-${delay}-${phase}`}
              AND state = 'pending' AND visible_at <= NOW(6)`
            assert.deepStrictEqual(eligible, [])
          }

          yield* sql`SET timestamp = ${timestamp + Math.ceil(delay / 1000)}`
          assert.strictEqual(yield* queue.take((_, { attempts }) => Effect.succeed(attempts)), 2)
        }), { timeout: 10_000 })
    }
  }
})
