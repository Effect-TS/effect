import { PgliteClient, PgliteMigrator } from "@effect/sql-pglite"
import { assert, describe, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import * as Migrator from "effect/sql/Migrator"
import { SqlClient } from "effect/sql/SqlClient"

const ClientLayer = PgliteClient.layer({})

const loader = Effect.succeed([
  [
    1,
    "init",
    Effect.succeed(Effect.gen(function*() {
      const sql = yield* SqlClient
      yield* sql`CREATE TABLE migrator_test (id SERIAL PRIMARY KEY, value TEXT)`
    }))
  ] as const,
  [
    2,
    "insert",
    Effect.succeed(Effect.gen(function*() {
      const sql = yield* SqlClient
      yield* sql`INSERT INTO migrator_test (value) VALUES ('hello')`
    }))
  ] as const
])

const MigratorLayer = PgliteMigrator.layer({ loader }).pipe(Layer.provide(ClientLayer))

describe("PgliteMigrator", () => {
  layer(Layer.merge(ClientLayer, MigratorLayer), { timeout: "30 seconds" })((it) => {
    it.effect("runs migrations and records them", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        const rows = yield* sql<{ value: string }>`SELECT value FROM migrator_test`
        assert.deepStrictEqual(rows, [{ value: "hello" }])
        const migrations = yield* sql<
          { migration_id: number; name: string }
        >`SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id`
        assert.deepStrictEqual(
          migrations.map((m) => [m.migration_id, m.name]),
          [[1, "init"], [2, "insert"]]
        )
      }))
  })
})

describe("Migrator.pending", () => {
  const loader = Migrator.fromRecord({
    "1_first": Effect.void,
    "2_second": Effect.void,
    "3_third": Effect.void
  })
  const tableExists = (table: string) =>
    Effect.gen(function*() {
      const sql = yield* SqlClient
      const rows = yield* sql<{ exists: boolean }>`SELECT to_regclass(${table}) IS NOT NULL AS exists`
      return rows[0].exists
    })

  // Each test uses its own migrations table, so they share one database.
  layer(ClientLayer, { timeout: "30 seconds" })((it) => {
    it.effect("treats every migration as pending without creating a missing migrations table", () =>
      Effect.gen(function*() {
        const table = "pending_missing_migrations"
        const pending = yield* Migrator.pending({ loader, table })

        assert.deepStrictEqual(pending, [[1, "first"], [2, "second"], [3, "third"]])
        assert.isFalse(yield* tableExists(table))
      }))

    it.effect("returns only migrations newer than the latest applied migration", () =>
      Effect.gen(function*() {
        const table = "pending_partial_migrations"
        yield* PgliteMigrator.run({
          loader: Migrator.fromRecord({ "1_first": Effect.void, "2_second": Effect.void }),
          table
        })

        const pending = yield* Migrator.pending({ loader, table })

        assert.deepStrictEqual(pending, [[3, "third"]])
      }))

    it.effect("returns nothing when every migration is applied", () =>
      Effect.gen(function*() {
        const table = "pending_complete_migrations"
        yield* PgliteMigrator.run({ loader, table })

        const pending = yield* Migrator.pending({ loader, table })

        assert.deepStrictEqual(pending, [])
      }))

    it.effect("finds a migrations table whose name needs quoting", () =>
      Effect.gen(function*() {
        const table = "MixedCase_pending_migrations"
        yield* PgliteMigrator.run({ loader, table })

        const pending = yield* Migrator.pending({ loader, table })

        assert.deepStrictEqual(pending, [])
      }))

    it.effect("does not lock the migrations table or run pending migrations", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient
        const table = "pending_lock_migrations"
        yield* PgliteMigrator.run({
          loader: Migrator.fromRecord({ "1_first": Effect.void }),
          table
        })

        // Locks taken in a transaction stay visible in pg_locks until it ends.
        const exclusiveLocks = yield* sql.withTransaction(Effect.gen(function*() {
          const pending = yield* Migrator.pending({
            loader: Migrator.fromRecord({
              "1_first": Effect.void,
              "2_create_table": sql`CREATE TABLE pending_should_not_run (id INT)`
            }),
            table
          })
          assert.deepStrictEqual(pending, [[2, "create_table"]])
          return yield* sql<{ mode: string }>`
            SELECT mode FROM pg_locks
            WHERE relation = to_regclass(${table}) AND mode = 'AccessExclusiveLock'
          `
        }))

        assert.deepStrictEqual(exclusiveLocks, [])
        assert.isFalse(yield* tableExists("pending_should_not_run"))
      }))
  })
})

describe("Migrator.make", () => {
  layer(ClientLayer, { timeout: "30 seconds" })((it) => {
    it.effect("reuses a migrations table whose name needs quoting", () =>
      Effect.gen(function*() {
        const table = "MixedCase_make_migrations"
        const loader = Migrator.fromRecord({ "1_first": Effect.void })
        yield* PgliteMigrator.run({ loader, table })

        const completed = yield* PgliteMigrator.run({ loader, table })

        assert.deepStrictEqual(completed, [])
      }))
  })
})
