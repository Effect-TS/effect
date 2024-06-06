import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import * as Sql from "@effect/sql"
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import * as D from "drizzle-orm/sqlite-core"
import { Effect } from "effect"

const makeClient = Effect.gen(function*(_) {
  const fs = yield* _(FileSystem.FileSystem)
  const dir = yield* _(fs.makeTempDirectoryScoped())
  return yield* _(Sqlite.client.make({
    filename: dir + "/test.db"
  }))
}).pipe(Effect.provide(NodeFileSystem.layer))

const users = D.sqliteTable("users", {
  id: D.integer("id").primaryKey(),
  name: D.text("name"),
  snakeCase: D.text("snake_case")
})

describe("SqliteDrizzle", () => {
  it.scoped("select", () =>
    Effect.gen(function*(_) {
      const sql = yield* _(makeClient)
      const db = yield* SqliteDrizzle.make.pipe(
        Effect.provideService(Sql.client.Client, sql)
      )
      yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, snake_case TEXT)`
      yield* db.insert(users).values({ name: "Alice", snakeCase: "snake" })
      const results = yield* db.select().from(users)
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "snake" }])
    }))

  it.scoped("remote callback", () =>
    Effect.gen(function*(_) {
      const sql = yield* _(makeClient)
      const db = yield* SqliteDrizzle.make.pipe(
        Effect.provideService(Sql.client.Client, sql)
      )
      yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, snake_case TEXT)`
      yield* Effect.promise(() => db.insert(users).values({ name: "Alice", snakeCase: "snake" }))
      const results = yield* Effect.promise(() => db.select().from(users))
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "snake" }])
    }))
})
