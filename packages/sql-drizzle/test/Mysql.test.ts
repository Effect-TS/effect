import { SqlClient } from "@effect/sql"
import { MysqlDrizzle } from "@effect/sql-drizzle/Mysql"
import { assert, describe, it } from "@effect/vitest"
import * as D from "drizzle-orm/mysql-core"
import { Effect } from "effect"
import { DrizzleMysqlLive } from "./utils.js"

const users = D.mysqlTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name").notNull(),
  snakeCase: D.text("snake_case").notNull()
})

describe.sequential("Mysql", () => {
  it.effect("works", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* MysqlDrizzle

      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, snake_case TEXT NOT NULL)`
      yield* db.insert(users).values({ name: "Alice", snakeCase: "alice" })
      const results = yield* db.select().from(users)
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "alice" }])
    }).pipe(
      Effect.provide(DrizzleMysqlLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60000 })

  it.effect("remote callback", () =>
    Effect.gen(function*(_) {
      const sql = yield* SqlClient.SqlClient
      const db = yield* MysqlDrizzle
      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, snake_case TEXT NOT NULL)`
      const rows = yield* Effect.promise(() =>
        db.insert(users).values({ name: "Alice", snakeCase: "snake" }).$returningId()
      )
      const results = yield* Effect.promise(() => db.select().from(users))
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "snake" }])
      assert.deepStrictEqual(rows, [{ id: 1 }])
    }).pipe(
      Effect.provide(DrizzleMysqlLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60000 })

  it.effect.only("remote callback multiple values", () =>
    Effect.gen(function*(_) {
      const sql = yield* SqlClient.SqlClient
      const db = yield* MysqlDrizzle
      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, snake_case TEXT NOT NULL)`
      const rows = yield* Effect.promise(() =>
        db.insert(users).values([
          { name: "Alice", snakeCase: "snake" },
          { name: "Bob", snakeCase: "snake" }
        ]).$returningId()
      )
      const results = yield* Effect.promise(() => db.select().from(users))
      assert.deepStrictEqual(results, [
        { id: 1, name: "Alice", snakeCase: "snake" },
        { id: 2, name: "Bob", snakeCase: "snake" }
      ])
      assert.deepStrictEqual(rows, [{ id: 1 }, { id: 2 }])
    }).pipe(
      Effect.provide(DrizzleMysqlLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60000 })
})
