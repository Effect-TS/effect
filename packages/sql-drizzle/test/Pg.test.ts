import { SqlClient } from "@effect/sql"
import { PgDrizzle } from "@effect/sql-drizzle/Pg"
import { assert, describe, it } from "@effect/vitest"
import * as D from "drizzle-orm/pg-core"
import { Effect } from "effect"
import { DrizzlePgLive } from "./utils.js"

const users = D.pgTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name").notNull(),
  snakeCase: D.text("snake_case").notNull()
})

describe.sequential("Pg", () => {
  it.effect("works", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* PgDrizzle

      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, snake_case TEXT NOT NULL)`
      yield* db.insert(users).values({ name: "Alice", snakeCase: "alice" })
      const results = yield* db.select().from(users)
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "alice" }])
    }).pipe(
      Effect.provide(DrizzlePgLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), {
    timeout: 60000
  })

  it.effect("remote callback", () =>
    Effect.gen(function*(_) {
      const sql = yield* SqlClient.SqlClient
      const db = yield* PgDrizzle
      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, snake_case TEXT NOT NULL)`
      yield* Effect.promise(() => db.insert(users).values({ name: "Alice", snakeCase: "snake" }))
      const results = yield* Effect.promise(() => db.select().from(users))
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "snake" }])
    }).pipe(
      Effect.provide(DrizzlePgLive),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), {
    timeout: 60000
  })
})
