import { SqlResolver } from "@effect/sql"
import * as SqliteKysely from "@effect/sql-kysely/Sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Schema } from "effect"
import type { Generated } from "kysely"

export interface User {
  id: Generated<number>
  name: string
  nickname: string | null
}

interface Database {
  users: User
}

class SqliteDB extends Context.Tag("SqliteDB")<SqliteDB, SqliteKysely.EffectKysely<Database>>() {}

const SqliteLive = Sqlite.SqliteClient.layer({
  filename: ":memory:"
})

const KyselyLive = Layer.effect(SqliteDB, SqliteKysely.make<Database>()).pipe(Layer.provide(SqliteLive))

describe("SqliteKysely", () => {
  it.effect("queries", () =>
    Effect.gen(function*() {
      const db = yield* SqliteDB

      yield* db.schema
        .createTable("users")
        .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
        .addColumn("name", "text", (c) => c.notNull())
        .addColumn("nickname", "text")

      const result = yield* db.withTransaction(
        Effect.gen(function*() {
          const inserted = yield* db.insertInto("users").values({ name: "Alice" }).returningAll()
          const selected = yield* db.selectFrom("users").selectAll()
          const updated = yield* db.updateTable("users").set({ name: "Bob", nickname: "The Bobinator" }).returningAll()
          assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice", nickname: null }])
          assert.deepStrictEqual(selected, [{ id: 1, name: "Alice", nickname: null }])
          assert.deepStrictEqual(updated, [{ id: 1, name: "Bob", nickname: "The Bobinator" }])
          return yield* Effect.fail(new Error("rollback"))
        })
      ).pipe(Effect.exit)
      if (Exit.isSuccess(result)) {
        assert.fail("should not reach here")
      }
      const selected = yield* db.selectFrom("users").selectAll()
      assert.deepStrictEqual(selected, [])
    }).pipe(Effect.provide(KyselyLive)))

  it.effect("select with resolver", () =>
    Effect.gen(function*() {
      const db = yield* SqliteDB

      yield* db.schema
        .createTable("users")
        .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
        .addColumn("name", "text", (c) => c.notNull())
        .addColumn("nickname", "text")

      yield* db.insertInto("users").values({ name: "Alice" })
      yield* db.insertInto("users").values({ name: "Bob", nickname: "The Bobinator" })
      yield* db.insertInto("users").values({ name: "Charlie" })

      const GetUserById = yield* SqlResolver.findById("GetUserById", {
        Id: Schema.Number,
        Result: Schema.Struct({ id: Schema.Number, name: Schema.String, nickname: Schema.NullOr(Schema.String) }),
        ResultId: (data) => data.id,
        execute: (ids) => db.selectFrom("users").where("id", "in", ids).selectAll()
      })

      const todoIds = [1, 2, 3].map((_) => GetUserById.execute(_))
      const result = yield* Effect.all(todoIds, { batching: true })
      assert.deepStrictEqual(result, [
        Option.some({ id: 1, name: "Alice", nickname: null }),
        Option.some({ id: 2, name: "Bob", nickname: "The Bobinator" }),
        Option.some({ id: 3, name: "Charlie", nickname: null })
      ])
    }).pipe(Effect.provide(KyselyLive)))
})
