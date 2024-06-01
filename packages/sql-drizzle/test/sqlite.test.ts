import * as Sql from "@effect/sql"
import * as SqliteDrizzle from "@effect/sql-drizzle/sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { gte } from "drizzle-orm"
import * as D from "drizzle-orm/sqlite-core"
import { Config, Effect, Layer } from "effect"

const users = D.sqliteTable("users", {
  id: D.integer("id").primaryKey(),
  name: D.text("name")
})

const SqlLive = Sqlite.client.layer({
  filename: Config.succeed(":memory:")
})
const DrizzleLive = SqliteDrizzle.layer

const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive)

describe("SqliteDrizzle", () => {
  it.scoped("query", () =>
    Effect.gen(function*(_) {
      const sql = yield* Sql.client.Client
      const db = yield* SqliteDrizzle.SqliteDrizzle

      yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`

      const inserted = yield* db.insert(users).values({ name: "Alice" }).returning()
      assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice" }])
      const selected = yield* db.select().from(users)
      assert.deepStrictEqual(selected, [{ id: 1, name: "Alice" }])
      const updated = yield* db.update(users).set({ name: "Bob" }).where(gte(users.id, 1)).returning()
      assert.deepStrictEqual(updated, [{ id: 1, name: "Bob" }])
      const deleted = yield* db.delete(users).where(gte(users.id, 1)).returning()
      assert.deepStrictEqual(deleted, [{ id: 1, name: "Bob" }])
    }).pipe(
      Effect.provide(DatabaseLive)
    ))
})
