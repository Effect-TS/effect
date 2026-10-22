import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem } from "effect"
import { Reactivity } from "effect/reactivity"
import * as Migrator from "effect/sql/Migrator"
import * as SqlClient from "effect/sql/SqlClient"
import * as SqlError from "effect/sql/SqlError"

const makeClients = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  const filename = dir + "/test.db"

  return {
    lockClient: yield* SqliteClient.make({ filename }),
    migratorClient: yield* SqliteClient.make({ filename })
  }
}).pipe(Effect.provide([NodeFileSystem.layer, Reactivity.layer]))

describe("SqliteMigrator", () => {
  it.effect("fails with a typed MigrationError and rolls back failed migrations", () =>
    Effect.gen(function*() {
      const { migratorClient } = yield* makeClients

      const error = yield* Effect.flip(
        SqliteMigrator.run({
          loader: SqliteMigrator.fromRecord({
            "1_bad": Effect.gen(function*() {
              const sql = yield* SqlClient.SqlClient
              yield* sql`INSERT INTO missing_table (id) VALUES (1)`
            })
          })
        }).pipe(Effect.provideService(SqlClient.SqlClient, migratorClient))
      )

      assert(error._tag === "MigrationError")
      assert.strictEqual(error.kind, "Failed")
      assert(SqlError.isSqlError(error.cause))
      assert.deepStrictEqual(yield* migratorClient`SELECT migration_id FROM effect_sql_migrations`, [])
    }))

  it.effect("exports a query snapshot and refreshes it when no migrations are pending", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const options = {
        schemaDirectory: directory,
        table: "Migration_Log",
        loader: Migrator.fromRecord({
          "1_create_users": Effect.gen(function*() {
            const sql = yield* SqlClient.SqlClient
            yield* sql`CREATE TABLE users (
              id INTEGER PRIMARY KEY,
              display_name TEXT NOT NULL,
              email TEXT,
              age INTEGER NOT NULL
            ) STRICT`
            yield* sql`CREATE TABLE sqlites (id INTEGER PRIMARY KEY) STRICT`
            yield* sql`INSERT INTO users VALUES (1, 'Ada', NULL, 36)`
          })
        })
      }
      assert.deepStrictEqual(yield* Migrator.runWithSnapshot(options), [[1, "create_users"]])
      const snapshot = yield* fs.readFileString(directory + "/_schema.json")
      const schema = {
        version: 2,
        dialect: "sqlite",
        tables: {
          sqlites: { id: { INTEGER: null } },
          users: {
            id: { INTEGER: null },
            display_name: { TEXT: null },
            email: { TEXT: null, NULL: null },
            age: { INTEGER: null }
          }
        }
      }
      assert.deepStrictEqual(JSON.parse(snapshot), schema)
      yield* fs.remove(directory + "/_schema.json")
      assert.deepStrictEqual(yield* Migrator.runWithSnapshot({ ...options, table: "migration_log" }), [])
      assert.strictEqual(yield* fs.readFileString(directory + "/_schema.json"), snapshot)

      const query = SqlClient.makeQuery(yield* SqlClient.SqlClient, schema)
      const rows = yield* query("SELECT id, display_name, email FROM users WHERE age >= :minimumAge", {
        minimumAge: 18
      })
      // Result-name transforms must not change the keys inferred from the schema.
      assert.deepStrictEqual(rows.map((row) => ({ ...row })), [{ id: 1, display_name: "Ada", email: null }])
    }).pipe(Effect.provide([
      NodeFileSystem.layer,
      SqliteClient.layer({ filename: ":memory:", transformResultNames: (name) => name.toUpperCase() })
    ])))

  it.effect.each([
    { statement: "CREATE TABLE unsupported (id INTEGER)", message: "must be STRICT" },
    { statement: "CREATE TABLE unsupported (id ANY) STRICT", message: "Unsupported SQLite type ANY" },
    { statement: "CREATE TABLE unsupported (value BLOB) STRICT", message: "Unsupported SQLite type BLOB" },
    {
      statement: "CREATE TABLE unsupported (id INTEGER, value INT GENERATED ALWAYS AS (id) VIRTUAL) STRICT",
      message: "Generated or hidden columns are not supported"
    }
  ])("rejects unsupported snapshot schemas: $statement", ({ statement, message }) =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const error = yield* Migrator.runWithSnapshot({
        schemaDirectory: directory,
        loader: Migrator.fromRecord({
          "1_unsupported": Effect.flatMap(SqlClient.SqlClient, (sql) => sql.unsafe(statement)).pipe(Effect.asVoid)
        })
      }).pipe(Effect.flip)
      assert(error._tag === "MigrationError")
      assert.strictEqual(error.kind, "BadState")
      assert.include(error.message, message)
      assert.isFalse(yield* fs.exists(directory + "/_schema.json"))
    }).pipe(Effect.provide([
      NodeFileSystem.layer,
      SqliteClient.layer({ filename: ":memory:" })
    ])))

  it.effect("reports snapshot write failures and retries after migrations have committed", () =>
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const directory = yield* fs.makeTempDirectoryScoped()
      const occupied = directory + "/occupied"
      yield* fs.writeFileString(occupied, "not a directory")
      const loader = Migrator.fromRecord({
        "1_create_users": Effect.flatMap(
          SqlClient.SqlClient,
          (sql) => sql`CREATE TABLE users (id INTEGER PRIMARY KEY) STRICT`
        ).pipe(Effect.asVoid)
      })
      const error = yield* Migrator.runWithSnapshot({ loader, schemaDirectory: occupied }).pipe(Effect.flip)
      assert(error._tag === "MigrationError")
      assert.strictEqual(error.kind, "Failed")
      assert.strictEqual(error.message, "Could not write schema snapshot")
      assert.isDefined(error.cause)

      assert.deepStrictEqual(yield* Migrator.runWithSnapshot({ loader, schemaDirectory: directory }), [])
      assert.isTrue(yield* fs.exists(directory + "/_schema.json"))
    }).pipe(Effect.provide([
      NodeFileSystem.layer,
      SqliteClient.layer({ filename: ":memory:" })
    ])))

  it.effect("fails on lock errors", () =>
    Effect.gen(function*() {
      const { lockClient, migratorClient } = yield* makeClients

      yield* migratorClient`PRAGMA busy_timeout = 1`

      yield* SqliteMigrator.run({
        loader: SqliteMigrator.fromRecord({})
      }).pipe(Effect.provideService(SqlClient.SqlClient, migratorClient))

      yield* Effect.acquireRelease(
        lockClient`BEGIN IMMEDIATE`,
        () => lockClient`ROLLBACK`.pipe(Effect.ignore)
      )

      const error = yield* Effect.flip(
        SqliteMigrator.run({
          loader: SqliteMigrator.fromRecord({
            "1_test": Effect.void
          })
        }).pipe(Effect.provideService(SqlClient.SqlClient, migratorClient))
      )

      assert.strictEqual(error._tag, "SqlError")
      assert(SqlError.isSqlError(error))
      assert.strictEqual(error.reason._tag, "LockTimeoutError")
    }))
})
