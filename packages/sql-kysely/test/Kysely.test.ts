import * as SqlKysely from "@effect/sql-kysely/Kysely"
import { assert, describe, it } from "@effect/vitest"
import SqliteDB from "better-sqlite3"
import { Context, Effect, Layer } from "effect"
import { CamelCasePlugin, type Generated, type Kysely, SqliteDialect } from "kysely"

export interface User {
  id: Generated<number>
  userName: string
  nickname: string | null
}

interface Database {
  users: User
}

class KyselyDB extends Context.Tag("KyselyDB")<KyselyDB, Kysely<Database>>() {}

const KyselyDBLive = Layer.sync(KyselyDB, () =>
  SqlKysely.make({
    dialect: new SqliteDialect({
      database: new SqliteDB(":memory:")
    }),
    plugins: [
      new CamelCasePlugin()
    ]
  }))

describe("Kysely", () => {
  it.effect("queries", () =>
    Effect.gen(function*() {
      const db = yield* KyselyDB

      const createTableQuery = db.schema
        .createTable("users")
        .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
        .addColumn("userName", "text", (c) => c.notNull())
        .addColumn("nickname", "text")

      yield* createTableQuery

      const inserted = yield* db.insertInto("users").values({ userName: "Alice" }).returningAll()
      const selected = yield* db.selectFrom("users").selectAll()
      const updated = yield* db.updateTable("users").set({ userName: "Bob", nickname: "The Bobinator" }).returningAll()
      const deleted = yield* db.deleteFrom("users").returningAll()

      assert.equal(
        createTableQuery.compile().sql,
        "create table \"users\" (\"id\" integer primary key autoincrement, \"user_name\" text not null, \"nickname\" text)"
      )
      assert.deepStrictEqual(inserted, [{ id: 1, userName: "Alice", nickname: null }])
      assert.deepStrictEqual(selected, [{ id: 1, userName: "Alice", nickname: null }])
      assert.deepStrictEqual(updated, [{ id: 1, userName: "Bob", nickname: "The Bobinator" }])
      assert.deepStrictEqual(deleted, [{ id: 1, userName: "Bob", nickname: "The Bobinator" }])
    }).pipe(Effect.provide(KyselyDBLive)))
})
