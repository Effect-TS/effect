import { NodeFileSystem } from "@effect/platform-node"
import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, FileSystem } from "effect"
import { Reactivity } from "effect/reactivity"
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

  it.effect("runs fromSql scripts and rolls back a failing script", () =>
    Effect.gen(function*() {
      const { migratorClient: sql } = yield* makeClients
      const scripts = {
        "0001_users.sql": "-- users;\ncreate table users (name text);\n" +
          "insert into users (name) values ('a;b'), ('it''s');\n/* done; */",
        // node:sqlite runs only the first statement of a merged chunk
        "0002_prices.sql": "create table price$usd$ (id int);\ncreate table posts (id int);"
      }

      const completed = yield* SqliteMigrator.run({ loader: SqliteMigrator.fromSql(scripts) }).pipe(
        Effect.provideService(SqlClient.SqlClient, sql)
      )
      assert.deepStrictEqual(completed, [[1, "users"], [2, "prices"]])
      assert.deepStrictEqual(
        (yield* sql<{ name: string }>`select name from users order by rowid`).map((row) => row.name),
        ["a;b", "it's"]
      )
      yield* sql`select id from posts`

      const exit = yield* SqliteMigrator.run({
        loader: SqliteMigrator.fromSql({
          ...scripts,
          "0003_broken.sql": "create table broken (id int);\ninsert into missing values (1);"
        })
      }).pipe(Effect.provideService(SqlClient.SqlClient, sql), Effect.exit)

      assert(Exit.isFailure(exit))
      const error = Cause.squash(exit.cause)
      assert(error instanceof SqliteMigrator.MigrationError)
      assert.strictEqual(error.kind, "Failed")
      const tables = yield* sql<{ name: string }>`select name from sqlite_master where name = 'broken'`
      assert.deepStrictEqual(tables, [])
      const recorded = yield* sql<{ migration_id: number }>`select migration_id from effect_sql_migrations`
      assert.deepStrictEqual(recorded.map((row) => row.migration_id), [1, 2])
    }))
})
