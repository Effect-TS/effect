import * as Sql from "@effect/sql"
import { MysqlDrizzle } from "@effect/sql-drizzle/Mysql"
import { assert, describe, it } from "@effect/vitest"
import * as D from "drizzle-orm/mysql-core"
import { Effect } from "effect"
import { MysqlContainer } from "./utils.js"

const users = D.mysqlTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name").notNull(),
  snakeCase: D.text("snake_case").notNull()
})

describe.sequential("Mysql", () => {
  it.effect("works", () =>
    Effect.gen(function*() {
      const sql = yield* Sql.client.Client
      const db = yield* MysqlDrizzle

      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, snake_case TEXT NOT NULL)`
      yield* db.insert(users).values({ name: "Alice", snakeCase: "alice" })
      const results = yield* db.select().from(users)
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "alice" }])
    }).pipe(
      Effect.provide(MysqlContainer.DrizzleLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60000 })

  it.effect("remote callback", () =>
    Effect.gen(function*(_) {
      const sql = yield* Sql.client.Client
      const db = yield* MysqlDrizzle
      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, snake_case TEXT NOT NULL)`
      yield* Effect.promise(() => db.insert(users).values({ name: "Alice", snakeCase: "snake" }))
      const results = yield* Effect.promise(() => db.select().from(users))
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "snake" }])
    }).pipe(
      Effect.provide(MysqlContainer.DrizzleLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), { timeout: 60000 })
})
