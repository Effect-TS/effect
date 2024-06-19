import * as SqlKysely from "@effect/sql-kysely/Kysely"
import { assert, describe, it } from "@effect/vitest"
import SqliteDB from "better-sqlite3"
import { Context, Effect, Layer } from "effect"
import { type Generated, type Kysely, SqliteDialect } from "kysely"

export interface User {
  id: Generated<number>
  name: string
}

interface Database {
  users: User
}

class KyselyDB extends Context.Tag("KyselyDB")<KyselyDB, Kysely<Database>>() {}

const SqlLive = Layer.effect(
  SqlKysely.KyselyDialect,
  Effect.sync(() =>
    new SqliteDialect({
      database: new SqliteDB(":memory:")
    })
  )
)
const KyselyLive = Layer.effect(KyselyDB, SqlKysely.make<Database>()).pipe(Layer.provide(SqlLive))

describe("Kysely", () => {
  it.scoped("queries", () =>
    Effect.gen(function*(_) {
      const db = yield* KyselyDB

      yield* db.schema
        .createTable("users")
        .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
        .addColumn("name", "text", (c) => c.notNull())

      const inserted = yield* db.insertInto("users").values({ name: "Alice" }).returningAll()
      const selected = yield* db.selectFrom("users").selectAll()
      const updated = yield* db.updateTable("users").set({ name: "Bob" }).returningAll()
      const deleted = yield* db.deleteFrom("users").returningAll()

      assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice" }])
      assert.deepStrictEqual(selected, [{ id: 1, name: "Alice" }])
      assert.deepStrictEqual(updated, [{ id: 1, name: "Bob" }])
      assert.deepStrictEqual(deleted, [{ id: 1, name: "Bob" }])
    }).pipe(Effect.provide(KyselyLive)))
})
