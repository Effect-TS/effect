import { MysqlClient } from "@effect/sql-mysql2"
import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit, Fiber, Layer, Redacted, Schedule, Schema } from "effect"
import { TestClock } from "effect/testing"
import { PersistedQueue } from "effect/unstable/persistence"
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

const assertPrecisionDiagnostic = (cause: Cause.Cause<unknown>, tableName: string) => {
  const error = Cause.squash(cause)
  assert.instanceOf(error, Error)
  assert.strictEqual(
    (error as Error).message,
    `PersistedQueue: MySQL table ${tableName} requires DATETIME(6) for visible_at, acquired_at, created_at and updated_at. ` +
      "The timestamp precision migration may have failed after being recorded as applied. " +
      "Repair these columns before restarting the queue store."
  )
}

it.layer(layer, { timeout: "60 seconds", concurrent: false })("PersistedQueue MySQL retry precision", (it) => {
  for (const column of ["visible_at", "acquired_at", "created_at", "updated_at"]) {
    for (const precision of [0, 3]) {
      it.effect(`rejects a partial upgrade with ${column} at precision ${precision}`, () =>
        Effect.gen(function*() {
          const sql = yield* MysqlClient.MysqlClient
          const tableName = `partial_${column}_${precision}`
          yield* sql`CREATE TABLE ${sql(tableName)} LIKE retry_precision`
          yield* sql`ALTER TABLE ${sql(tableName)} MODIFY ${sql(column)} DATETIME(${sql.literal(String(precision))}) ${
            sql.literal(column === "acquired_at" ? "NULL" : "NOT NULL")
          }`
          yield* sql`CREATE TABLE ${sql(`${tableName}_migrations`)} LIKE retry_precision_migrations`
          yield* sql`INSERT INTO ${sql(`${tableName}_migrations`)} SELECT * FROM retry_precision_migrations`
          const startup = yield* PersistedQueue.makeStoreSql({ tableName }).pipe(Effect.exit)
          assert.isTrue(Exit.isFailure(startup))
          if (Exit.isFailure(startup)) assertPrecisionDiagnostic(startup.cause, tableName)
        }))
    }
  }

  it.effect(
    "rejects or repairs an applied precision migration with old columns before delivering retries",
    () =>
      Effect.gen(function*() {
        const sql = yield* MysqlClient.MysqlClient
        yield* sql`CREATE TABLE interrupted_upgrade LIKE retry_precision`
        yield* sql`ALTER TABLE interrupted_upgrade
        MODIFY visible_at DATETIME NOT NULL, MODIFY acquired_at DATETIME NULL,
        MODIFY created_at DATETIME NOT NULL, MODIFY updated_at DATETIME NOT NULL`
        yield* sql`CREATE TABLE interrupted_upgrade_migrations LIKE retry_precision_migrations`
        yield* sql`INSERT INTO interrupted_upgrade_migrations
        SELECT * FROM retry_precision_migrations WHERE migration_id < 3`

        // Independently reproduce MySQL's implicit commit before failing DDL:
        // the marker survives rollback while the timestamp columns stay unchanged.
        const ddl = yield* Effect.gen(function*() {
          yield* sql`INSERT INTO interrupted_upgrade_migrations (migration_id, name)
          VALUES (3, 'mysql_timestamp_precision')`
          yield* sql`ALTER TABLE interrupted_upgrade MODIFY missing_column DATETIME(6)`
        }).pipe(sql.withTransaction, Effect.exit)
        assert.isTrue(Exit.isFailure(ddl))
        const markers = yield* sql`SELECT migration_id FROM interrupted_upgrade_migrations WHERE migration_id = 3`
        assert.strictEqual(markers.length, 1)
        const columns = yield* sql<{ fractional_digits: number }>`SELECT DATETIME_PRECISION AS fractional_digits
        FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'interrupted_upgrade' AND column_name = 'visible_at'`
        assert.strictEqual(columns[0].fractional_digits, 0)

        const startup = yield* PersistedQueue.makeStoreSql({
          tableName: "interrupted_upgrade",
          pollInterval: "10 millis"
        }).pipe(Effect.exit)
        // Refusing unsafe startup is valid; a repaired store must honor the delay.
        if (Exit.isFailure(startup)) {
          assertPrecisionDiagnostic(startup.cause, "interrupted_upgrade")
          return
        }
        const factory = yield* PersistedQueue.makeFactory.pipe(
          Effect.provideService(PersistedQueue.PersistedQueueStore, startup.value)
        )
        const queue = yield* factory.make({
          name: "interrupted",
          schema: Schema.Number,
          retrySchedule: Schedule.spaced(500)
        })
        yield* sql`SET timestamp = 1800000000`
        yield* Effect.addFinalizer(() => sql`SET timestamp = DEFAULT`.pipe(Effect.orDie))
        yield* queue.offer(42)
        assert.strictEqual(
          yield* queue.take(() => sql`SET timestamp = 1800000000.9`.pipe(Effect.andThen(Effect.fail("boom")))).pipe(
            Effect.flip
          ),
          "boom"
        )
        // Only 100 ms after failure. DATETIME(0) rounds the intended .4 deadline
        // down to the whole second, allowing the queue to redeliver here.
        yield* sql`SET timestamp = 1800000001`
        const fiber = yield* queue.take((_, { attempts }) => Effect.succeed(attempts)).pipe(Effect.forkScoped)
        yield* Effect.sleep(100)
        assert.isUndefined(fiber.pollUnsafe())
        yield* sql`SET timestamp = 1800000002`
        assert.strictEqual(yield* Fiber.join(fiber), 2)
      }).pipe(TestClock.withLive),
    { timeout: 10_000 }
  )

  it.effect("upgrades an existing queue once and preserves its rows and indexes", () =>
    Effect.gen(function*() {
      const sql = yield* MysqlClient.MysqlClient
      const tableName = "existing_queue"
      // Schema and migration history from before the precision migration.
      // Build the fixture independently of the current migration implementation.
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
        [2, "upgrade_schema"],
        [3, "mysql_timestamp_precision"]
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
          // Exact equality also catches unnecessary rounding up to whole seconds.
          // Freezing MySQL time avoids TestClock/live-clock scheduling races.
          const rows = yield* sql<{ delay_us: number; attempts: number; state: string }>`
            SELECT TIMESTAMPDIFF(MICROSECOND, NOW(6), visible_at) AS delay_us, attempts, state
            FROM retry_precision WHERE queue_name = ${`retry-precision-${delay}-${phase}`}
          `
          assert.strictEqual(rows.length, 1)
          assert.strictEqual(rows[0].attempts, 1)
          assert.strictEqual(rows[0].state, "pending")
          assert.strictEqual(Number(rows[0].delay_us), delay * 1000)

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
