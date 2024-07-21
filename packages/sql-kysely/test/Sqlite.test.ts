import * as SqliteKysely from "@effect/sql-kysely/Sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Config, Context, Effect, Exit, Layer } from "effect"
import type { Generated } from "kysely"

export interface User {
  id: Generated<number>
  name: string
}

interface Database {
  users: User
}

class SqliteDB extends Context.Tag("SqliteDB")<SqliteDB, SqliteKysely.EffectKysely<Database>>() {}

const SqliteLive = Sqlite.SqliteClient.layer({
  filename: Config.succeed(":memory:")
})

const KyselyLive = Layer.effect(SqliteDB, SqliteKysely.make<Database>()).pipe(Layer.provide(SqliteLive))

describe("SqliteKysely", () => {
  it.effect("queries", () =>
    Effect.gen(function*(_) {
      const db = yield* SqliteDB

      yield* db.schema
        .createTable("users")
        .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
        .addColumn("name", "text", (c) => c.notNull())

      const result = yield* db.withTransaction(
        Effect.gen(function*() {
          const inserted = yield* db.insertInto("users").values({ name: "Alice" }).returningAll()
          const selected = yield* db.selectFrom("users").selectAll()
          const updated = yield* db.updateTable("users").set({ name: "Bob" }).returningAll()
          assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice" }])
          assert.deepStrictEqual(selected, [{ id: 1, name: "Alice" }])
          assert.deepStrictEqual(updated, [{ id: 1, name: "Bob" }])
          return yield* Effect.fail(new Error("rollback"))
        })
      ).pipe(Effect.exit)
      if (Exit.isSuccess(result)) {
        assert.fail("should not reach here")
      }
      const selected = yield* db.selectFrom("users").selectAll()
      assert.deepStrictEqual(selected, [])
    }).pipe(Effect.provide(KyselyLive)))
})
