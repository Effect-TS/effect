import * as Sql from "@effect/sql"
import * as SqliteDrizzle from "@effect/sql-drizzle/sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { gte } from "drizzle-orm"
import * as D from "drizzle-orm/sqlite-core"
import { Effect } from "effect"

const makeClient = Effect.gen(function*(_) {
  return yield* Sqlite.client.make({
    filename: ":memory:"
  })
})

const users = D.sqliteTable("users", {
  id: D.integer("id").primaryKey(),
  name: D.text("name")
})

describe("SqliteDrizzle", () => {
  it.scoped("query", () =>
    Effect.gen(function*(_) {
      const sql = yield* makeClient
      const db = yield* SqliteDrizzle.make.pipe(
        Effect.provideService(Sql.client.Client, sql)
      )

      yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`

      const inserted = yield* db.insert(users).values({ name: "Alice" }).returning()
      assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice" }])
      const selected = yield* db.select().from(users)
      assert.deepStrictEqual(selected, [{ id: 1, name: "Alice" }])
      const updated = yield* db.update(users).set({ name: "Bob" }).where(gte(users.id, 1)).returning()
      assert.deepStrictEqual(updated, [{ id: 1, name: "Bob" }])
      const deleted = yield* db.delete(users).where(gte(users.id, 1)).returning()
      assert.deepStrictEqual(deleted, [{ id: 1, name: "Bob" }])
    }))
})
