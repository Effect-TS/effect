import { Reactivity } from "@effect/experimental"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { SqlClient } from "@effect/sql"
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import * as D from "drizzle-orm/sqlite-core"
import { Effect, Layer } from "effect"

const SqlClientLive = Layer.scoped(
  SqlClient.SqlClient,
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const dir = yield* fs.makeTempDirectoryScoped()
    return yield* SqliteClient.make({
      filename: dir + "/test.db"
    })
  })
).pipe(
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(Reactivity.layer)
)

const SqliteDrizzleLive = SqliteDrizzle.layer.pipe(Layer.provideMerge(SqlClientLive))

const users = D.sqliteTable("users", {
  id: D.integer("id").primaryKey(),
  name: D.text("name"),
  snakeCase: D.text("snake_case")
})

class ORM extends Effect.Service<ORM>()("ORM", { effect: SqliteDrizzle.make({ schema: { users } }) }) {
  static Client = this.Default.pipe(Layer.provideMerge(SqlClientLive))
}

describe("SqliteDrizzle", () => {
  it.effect("select", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* SqliteDrizzle.SqliteDrizzle
      yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, snake_case TEXT)`
      yield* db.insert(users).values({ name: "Alice", snakeCase: "snake" })
      const results = yield* db.select().from(users)
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "snake" }])
    }).pipe(Effect.provide(SqliteDrizzleLive)))

  it.effect("orm", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* ORM
      yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, snake_case TEXT)`
      yield* db.insert(users).values({ name: "Alice", snakeCase: "snake" })
      const results = yield* db.query.users.findMany()
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "snake" }])
    }).pipe(Effect.provide(ORM.Client)))

  it.effect("remote callback", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* SqliteDrizzle.SqliteDrizzle
      yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, snake_case TEXT)`
      yield* Effect.promise(() => db.insert(users).values({ name: "Alice", snakeCase: "snake" }))
      const results = yield* Effect.promise(() => db.select().from(users))
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "snake" }])
    }).pipe(Effect.provide(SqliteDrizzleLive)))
})
