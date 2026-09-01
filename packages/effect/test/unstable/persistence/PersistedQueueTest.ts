import { assert, it } from "@effect/vitest"
import type { Vitest } from "@effect/vitest"
import { Duration, Effect, Fiber, Latch, Layer, Schedule, Schema } from "effect"
import { TestClock } from "effect/testing"
import { PersistedQueue } from "effect/unstable/persistence"
import { Migrator, SqlClient } from "effect/unstable/sql"

const Item = Schema.Struct({
  n: Schema.BigInt
})

// advance the virtual clock one poll cycle, give real-time stores a moment,
// then check the forked take is still waiting
const assertNotDelivered = <A, E>(fiber: Fiber.Fiber<A, E>) =>
  Effect.gen(function*() {
    yield* TestClock.adjust(1000)
    yield* Effect.sleep(1000).pipe(TestClock.withLive)
    assert.isUndefined(fiber.pollUnsafe())
  })

// move both the virtual clock and real time past a 1 second ttl
const advancePastTtl = Effect.gen(function*() {
  yield* TestClock.adjust("2 minutes")
  yield* Effect.sleep(1500).pipe(TestClock.withLive)
})

export const suiteWith = <R>(
  name: string,
  layer: Layer.Layer<PersistedQueue.PersistedQueueStore, unknown, R>,
  testApi: Vitest.MethodsNonLive<R>,
  timeout: Duration.Input = "30 seconds"
) => {
  const testOptions = { timeout: Duration.toMillis(timeout) }
  return testApi.layer(
    PersistedQueue.layer.pipe(
      Layer.provideMerge(layer)
    ),
    { timeout }
  )(`PersistedQueue (${name})`, (it) => {
    it.effect("offer + take", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-a",
          schema: Item
        })

        yield* queue.offer({ n: 42n })
        yield* queue.take(Effect.fnUntraced(function*(value, metadata) {
          assert.strictEqual(value.n, 42n)
          assert.strictEqual(metadata.attempts, 1)
        }))
      }), testOptions)

    it.effect("interrupt", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-b",
          schema: Item
        })

        yield* queue.offer({ n: 42n })

        const latch = Latch.makeUnsafe()
        const fiber = yield* queue.take(Effect.fnUntraced(function*(_value) {
          yield* latch.open
          return yield* Effect.never
        })).pipe(Effect.forkScoped)

        const fiber2 = yield* queue.take((val) => Effect.succeed(val)).pipe(Effect.forkScoped)

        yield* latch.await

        // the second take really waits while the element is being processed
        yield* assertNotDelivered(fiber2)

        yield* Fiber.interrupt(fiber)

        yield* TestClock.adjust(1000)

        assert.strictEqual((yield* Fiber.join(fiber2)).n, 42n)
      }), testOptions)

    it.effect("failure", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-c",
          schema: Item,
          retrySchedule: Schedule.spaced(0)
        })

        yield* queue.offer({ n: 42n })

        const error = yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip)
        assert.strictEqual(error, "boom")

        const value = yield* queue.take((val, { attempts }) => {
          assert.strictEqual(attempts, 2)
          return Effect.succeed(val)
        })
        assert.strictEqual(value.n, 42n)
      }), testOptions)

    it.effect("delays retries with the retry schedule", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-retry-schedule",
          schema: Item,
          retrySchedule: Schedule.spaced(500)
        })

        yield* queue.offer({ n: 42n })

        const error = yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip)
        assert.strictEqual(error, "boom")

        const fiber = yield* queue.take((_val, { attempts }) => Effect.succeed(attempts)).pipe(
          Effect.forkScoped
        )

        // not redelivered before the retry delay elapses
        yield* TestClock.adjust(100)
        yield* Effect.sleep(100).pipe(TestClock.withLive)
        assert.isUndefined(fiber.pollUnsafe())

        // give real-time backends time to pass the retry delay and poll again
        for (let i = 0; i < 3; i++) {
          yield* TestClock.adjust(1000)
          yield* Effect.sleep(700).pipe(TestClock.withLive)
        }
        yield* TestClock.adjust(1000)

        assert.strictEqual(yield* Fiber.join(fiber), 2)
      }), testOptions)

    it.effect("idempotent offer", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "idempotent-offer",
          schema: Item
        })

        yield* queue.offer({ n: 42n }, { id: "custom-id" })
        yield* queue.offer({ n: 42n }, { id: "custom-id" })
        yield* queue.take(Effect.fnUntraced(function*(value) {
          assert.strictEqual(value.n, 42n)
        }))
        const fiber = yield* queue.take(Effect.fnUntraced(function*(value) {
          assert.strictEqual(value.n, 42n)
        })).pipe(Effect.forkScoped)

        yield* assertNotDelivered(fiber)
      }), testOptions)

    it.effect("deduplicates custom ids independently in each queue", () =>
      Effect.gen(function*() {
        const first = yield* PersistedQueue.make({ name: "custom-id-first", schema: Item })
        const second = yield* PersistedQueue.make({ name: "custom-id-second", schema: Item })

        yield* first.offer({ n: 1n }, { id: "shared-custom-id" })
        yield* second.offer({ n: 2n }, { id: "shared-custom-id" })

        const fiber = yield* second.take(Effect.succeed).pipe(Effect.forkScoped)
        yield* TestClock.adjust(1000)
        yield* Effect.sleep(1000).pipe(TestClock.withLive)

        assert.isDefined(fiber.pollUnsafe())
        assert.deepStrictEqual(yield* Fiber.join(fiber), { n: 2n })
      }), testOptions)

    it.effect("does not redeliver in-flight elements", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-reset",
          schema: Item
        })

        yield* queue.offer({ n: 42n })

        const taken = Latch.makeUnsafe()
        const release = Latch.makeUnsafe()
        const fiber = yield* queue.take(() => Effect.andThen(taken.open, release.await)).pipe(Effect.forkScoped)
        yield* taken.await

        const fiber2 = yield* queue.take((val) => Effect.succeed(val)).pipe(Effect.forkScoped)

        // allow any periodic reset in the store to run while the element is
        // still being processed
        yield* assertNotDelivered(fiber2)

        // after a successful take the element should not be delivered again
        yield* release.open
        yield* Fiber.join(fiber)
        yield* assertNotDelivered(fiber2)

        yield* Fiber.interrupt(fiber2)
      }), testOptions)

    it.effect("stops delivering when maxAttempts is exhausted", () =>
      Effect.gen(function*() {
        const queue = yield* PersistedQueue.make({
          name: "test-queue-exhausted",
          schema: Item,
          maxAttempts: 1,
          retrySchedule: Schedule.spaced(0)
        })

        yield* queue.offer({ n: 42n })

        const error = yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip)
        assert.strictEqual(error, "boom")

        const fiber = yield* queue.take((val) => Effect.succeed(val)).pipe(Effect.forkScoped)

        yield* assertNotDelivered(fiber)
      }), testOptions)

    it.effect("dead-letters elements that fail to decode", () =>
      Effect.gen(function*() {
        const store = yield* PersistedQueue.PersistedQueueStore
        const queue = yield* PersistedQueue.make({
          name: "test-queue-decode-failure",
          schema: Item,
          retrySchedule: Schedule.spaced(0)
        })

        yield* store.offer({
          name: "test-queue-decode-failure",
          id: "poison",
          element: { n: null },
          isCustomId: true
        })
        yield* queue.offer({ n: 42n })

        // the poison element is marked as failed and skipped
        const value = yield* queue.take(Effect.succeed)
        assert.deepStrictEqual(value, { n: 42n })

        // the poison element is not delivered again
        const fiber = yield* queue.take(Effect.succeed).pipe(Effect.forkScoped)
        yield* assertNotDelivered(fiber)
      }), testOptions)

    it.effect("cleanup removes expired completed elements", () =>
      Effect.gen(function*() {
        const store = yield* PersistedQueue.PersistedQueueStore
        const queue = yield* PersistedQueue.make({
          name: "test-queue-cleanup",
          schema: Item
        })

        yield* queue.offer({ n: 1n }, { id: "cleanup-id" })
        yield* queue.take(Effect.succeed)

        // within the ttl the dedupe entry survives, so re-offers are ignored
        yield* store.cleanup({ timeToLive: Duration.days(30), failedTimeToLive: undefined })
        yield* queue.offer({ n: 2n }, { id: "cleanup-id" })
        const fiber = yield* queue.take(Effect.succeed).pipe(Effect.forkScoped)
        yield* assertNotDelivered(fiber)

        // after the ttl the completed element and its dedupe entry go away
        yield* advancePastTtl
        yield* store.cleanup({ timeToLive: Duration.seconds(1), failedTimeToLive: undefined })
        yield* queue.offer({ n: 3n }, { id: "cleanup-id" })
        yield* TestClock.adjust(1000)
        assert.deepStrictEqual(yield* Fiber.join(fiber), { n: 3n })
      }), testOptions)

    it.effect("cleanup removes failed elements only with failedTimeToLive", () =>
      Effect.gen(function*() {
        const store = yield* PersistedQueue.PersistedQueueStore
        const queue = yield* PersistedQueue.make({
          name: "test-queue-cleanup-failed",
          schema: Item,
          maxAttempts: 1,
          retrySchedule: Schedule.spaced(0)
        })

        yield* queue.offer({ n: 1n }, { id: "failed-cleanup-id" })
        const error = yield* queue.take(() => Effect.fail("boom")).pipe(Effect.flip)
        assert.strictEqual(error, "boom")

        // without failedTimeToLive the failed element is the dead-letter
        // record and is kept, so its id stays deduplicated
        yield* advancePastTtl
        yield* store.cleanup({ timeToLive: Duration.seconds(1), failedTimeToLive: undefined })
        yield* queue.offer({ n: 2n }, { id: "failed-cleanup-id" })
        const fiber = yield* queue.take(Effect.succeed).pipe(Effect.forkScoped)
        yield* assertNotDelivered(fiber)

        // with failedTimeToLive the failed element and its dedupe entry go away
        yield* store.cleanup({ timeToLive: Duration.days(30), failedTimeToLive: Duration.seconds(1) })
        yield* queue.offer({ n: 3n }, { id: "failed-cleanup-id" })
        yield* TestClock.adjust(1000)
        assert.deepStrictEqual(yield* Fiber.join(fiber), { n: 3n })
      }), testOptions)

    it.effect("cleanup keeps dedupe entries for unprocessed elements", () =>
      Effect.gen(function*() {
        const store = yield* PersistedQueue.PersistedQueueStore
        const queue = yield* PersistedQueue.make({
          name: "test-queue-cleanup-pending",
          schema: Item
        })

        yield* queue.offer({ n: 1n }, { id: "pending-cleanup-id" })

        // an element older than the ttl that was never processed keeps its
        // dedupe entry, so the re-offer does not enqueue a duplicate
        yield* advancePastTtl
        yield* store.cleanup({ timeToLive: Duration.seconds(1), failedTimeToLive: undefined })
        yield* queue.offer({ n: 2n }, { id: "pending-cleanup-id" })

        const value = yield* queue.take(Effect.succeed)
        assert.deepStrictEqual(value, { n: 1n })

        const fiber = yield* queue.take(Effect.succeed).pipe(Effect.forkScoped)
        yield* assertNotDelivered(fiber)
      }), testOptions)
  })
}

export const suite = (name: string, layer: Layer.Layer<PersistedQueue.PersistedQueueStore, unknown>) =>
  suiteWith(name, layer, it)

const originalSqlMigration = (tableName: string) =>
  Effect.gen(function*() {
    const sql = (yield* SqlClient.SqlClient).withoutTransforms()
    const table = sql(tableName)

    yield* sql.onDialectOrElse({
      mysql: () =>
        sql`CREATE TABLE IF NOT EXISTS ${table} (
          sequence BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          id VARCHAR(36) NOT NULL,
          queue_name VARCHAR(100) NOT NULL,
          element TEXT NOT NULL,
          completed BOOLEAN NOT NULL,
          attempts INT NOT NULL DEFAULT 0,
          last_failure TEXT NULL,
          acquired_at DATETIME NULL,
          acquired_by VARCHAR(36) NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL
        )`,
      pg: () =>
        sql`CREATE TABLE IF NOT EXISTS ${table} (
          sequence SERIAL PRIMARY KEY,
          id VARCHAR(36) NOT NULL,
          queue_name VARCHAR(100) NOT NULL,
          element TEXT NOT NULL,
          completed BOOLEAN NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_failure TEXT NULL,
          acquired_at TIMESTAMP NULL,
          acquired_by UUID NULL,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL
        )`,
      mssql: () =>
        sql`IF NOT EXISTS (SELECT * FROM sysobjects WHERE name=${tableName} AND xtype='U')
        CREATE TABLE ${table} (
          sequence INT IDENTITY(1,1) PRIMARY KEY,
          id NVARCHAR(36) NOT NULL,
          queue_name NVARCHAR(100) NOT NULL,
          element NVARCHAR(MAX) NOT NULL,
          completed BIT NOT NULL,
          attempts INT NOT NULL DEFAULT 0,
          last_failure NVARCHAR(MAX) NULL,
          acquired_at DATETIME2 NULL,
          acquired_by UNIQUEIDENTIFIER NULL,
          created_at DATETIME2 NOT NULL,
          updated_at DATETIME2 NOT NULL
        )`,
      orElse: () =>
        sql`CREATE TABLE IF NOT EXISTS ${table} (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT NOT NULL,
          queue_name TEXT NOT NULL,
          element TEXT NOT NULL,
          completed BOOLEAN NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_failure TEXT NULL,
          acquired_at DATETIME NULL,
          acquired_by TEXT NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL
        )`
    })

    yield* sql.onDialectOrElse({
      mssql: () => sql`CREATE UNIQUE INDEX ${sql(`idx_${tableName}_id`)} ON ${table} (id, queue_name)`,
      mysql: () => sql`CREATE UNIQUE INDEX ${sql(`idx_${tableName}_id`)} ON ${table} (id, queue_name)`,
      orElse: () => sql`CREATE UNIQUE INDEX IF NOT EXISTS ${sql(`idx_${tableName}_id`)} ON ${table} (id, queue_name)`
    })

    yield* sql.onDialectOrElse({
      mssql: () =>
        sql`CREATE INDEX ${sql(`idx_${tableName}_take`)} ON ${table} (queue_name, completed, attempts, acquired_at)`,
      mysql: () =>
        sql`CREATE INDEX ${sql(`idx_${tableName}_take`)} ON ${table} (queue_name, completed, attempts, acquired_at)`,
      orElse: () =>
        sql`CREATE INDEX IF NOT EXISTS ${
          sql(`idx_${tableName}_take`)
        } ON ${table} (queue_name, completed, attempts, acquired_at)`
    })

    yield* sql.onDialectOrElse({
      mssql: () => sql`CREATE INDEX ${sql(`idx_${tableName}_update`)} ON ${table} (sequence, acquired_by)`,
      mysql: () => sql`CREATE INDEX ${sql(`idx_${tableName}_update`)} ON ${table} (sequence, acquired_by)`,
      orElse: () =>
        sql`CREATE INDEX IF NOT EXISTS ${sql(`idx_${tableName}_update`)} ON ${table} (sequence, acquired_by)`
    })
  })

export const sqlMigrationSuite = (
  name: string,
  layer: Layer.Layer<SqlClient.SqlClient, unknown>,
  timeout: Duration.Input = "30 seconds"
) =>
  it.layer(layer, { timeout })(`PersistedQueue SQL migrations (${name})`, (it) => {
    it.effect("upgrades the original schema without losing data", () =>
      Effect.gen(function*() {
        const sql = (yield* SqlClient.SqlClient).withoutTransforms()
        const tableName = "persisted_queue_upgrade_test"
        const table = sql(tableName)
        const migrationsTable = `${tableName}_migrations`

        yield* Migrator.make({})({
          loader: Migrator.fromRecord({
            "0001_create_table": originalSqlMigration(tableName)
          }),
          table: migrationsTable
        })

        const now = sql.onDialectOrElse({
          mssql: () => sql.literal("SYSDATETIME()"),
          mysql: () => sql.literal("NOW()"),
          pg: () => sql.literal("NOW()"),
          orElse: () => sql.literal("CURRENT_TIMESTAMP")
        })
        const completedFalse = sql.onDialectOrElse({
          mysql: () => sql.literal("FALSE"),
          pg: () => sql.literal("FALSE"),
          orElse: () => sql.literal("0")
        })
        const completedTrue = sql.onDialectOrElse({
          mysql: () => sql.literal("TRUE"),
          pg: () => sql.literal("TRUE"),
          orElse: () => sql.literal("1")
        })
        yield* sql`INSERT INTO ${table}
          (id, queue_name, element, completed, attempts, last_failure, acquired_at, acquired_by, created_at, updated_at)
          VALUES
          ('pending-id', 'upgrade-queue', ${
          JSON.stringify({ value: "pending" })
        }, ${completedFalse}, 2, 'previous failure', NULL, NULL, ${now}, ${now}),
          ('completed-id', 'upgrade-queue', ${
          JSON.stringify({ value: "completed" })
        }, ${completedTrue}, 1, NULL, NULL, NULL, ${now}, ${now})`

        const store = yield* PersistedQueue.makeStoreSql({ tableName, pollInterval: "10 millis" })
        yield* PersistedQueue.makeStoreSql({ tableName, pollInterval: "10 millis" })

        const migrations = yield* sql<{
          readonly migration_id: number
          readonly name: string
        }>`SELECT migration_id, name FROM ${sql(migrationsTable)} ORDER BY migration_id`
        assert.deepStrictEqual(
          migrations.map((migration) => [
            Number(migration.migration_id),
            migration.name
          ]),
          [[1, "create_table"], [2, "upgrade_schema"]]
        )

        const rows = yield* sql<{
          readonly id: string
          readonly state: string
          readonly attempts: number
          readonly last_failure: string | null
          readonly visible_at: Date | string | null
        }>`SELECT id, state, attempts, last_failure, visible_at FROM ${table} ORDER BY sequence`
        assert.deepStrictEqual(
          rows.map((row) => ({
            id: row.id,
            state: row.state,
            attempts: Number(row.attempts),
            lastFailure: row.last_failure
          })),
          [
            { id: "pending-id", state: "pending", attempts: 2, lastFailure: "previous failure" },
            { id: "completed-id", state: "completed", attempts: 1, lastFailure: null }
          ]
        )
        assert.isNotNull(rows[0].visible_at)
        assert.isNotNull(rows[1].visible_at)

        yield* store.offer({
          name: "upgrade-queue",
          id: "completed-id",
          element: { value: "duplicate" },
          isCustomId: true
        })
        const completedRows = yield* sql<{ readonly count: number }>`
          SELECT COUNT(*) AS count FROM ${table} WHERE id = 'completed-id' AND queue_name = 'upgrade-queue'
        `
        assert.strictEqual(Number(completedRows[0].count), 1)

        const pending = yield* Effect.scoped(store.take({
          name: "upgrade-queue",
          maxAttempts: 10,
          retryDelay: () => Effect.succeed(Duration.zero)
        }))
        assert.deepStrictEqual(pending, {
          id: "pending-id",
          attempts: 3,
          element: { value: "pending" }
        })

        const longId = "i".repeat(200)
        const longQueueName = "q".repeat(200)
        const largeElement = "x".repeat(70_000)
        yield* store.offer({
          name: longQueueName,
          id: longId,
          element: largeElement,
          isCustomId: true
        })
        const upgraded = yield* Effect.scoped(store.take({
          name: longQueueName,
          maxAttempts: 10,
          retryDelay: () => Effect.succeed(Duration.zero)
        }))
        assert.strictEqual(upgraded.id, longId)
        assert.strictEqual(upgraded.attempts, 1)
        assert.strictEqual(upgraded.element, largeElement)
      }), { timeout: Duration.toMillis(timeout) })
  })
