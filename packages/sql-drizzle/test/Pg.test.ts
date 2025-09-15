import { SqlClient } from "@effect/sql"
import * as Pg from "@effect/sql-drizzle/Pg"
import { assert, describe, it } from "@effect/vitest"
import * as D from "drizzle-orm/pg-core"
import { Effect, Layer } from "effect"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import { PgContainer } from "./utils-pg.js"
import { DrizzlePgLive } from "./utils.js"

const users = D.pgTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name").notNull(),
  snakeCase: D.text("snake_case").notNull()
})

class ORM extends Effect.Service<ORM>()("ORM", { effect: Pg.make({ schema: { users } }) }) {
  static Client = this.Default.pipe(Layer.provideMerge(PgContainer.ClientLive))
}

describe.sequential("Pg", () => {
  it.effect("works", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* Pg.PgDrizzle

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

  it.effect("orm", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* ORM

      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, snake_case TEXT NOT NULL)`
      yield* db.insert(users).values({ name: "Alice", snakeCase: "alice" })
      const results = yield* db.query.users.findMany()
      assert.deepStrictEqual(results, [{ id: 1, name: "Alice", snakeCase: "alice" }])
    }).pipe(
      Effect.provide(ORM.Client),
      Effect.catchTag("ContainerError", () => Effect.void)
    ), {
    timeout: 60000
  })

  it.effect("remote callback", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* Pg.PgDrizzle
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

  it.effect("fail properly for conflict issues", () => {
    const logs: Array<unknown> = []
    const logger = Logger.make((opts) => {
      globalThis.console.log(opts)
      return logs.push(opts.message)
    })
    return Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const db = yield* Pg.PgDrizzle

      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, snake_case TEXT NOT NULL)`
      yield* db.insert(users).values({ name: "Alice", snakeCase: "test" })
      yield* Effect.flip(
        db.insert(users).values({ name: "Alice", snakeCase: "test" })
      )
      assert.deepEqual(logs, [])
    }).pipe(
      Effect.provide([
        DrizzlePgLive,
        Logger.replace(Logger.defaultLogger, logger),
        Logger.minimumLogLevel(LogLevel.Debug)
      ]),
      Effect.catchTag("ContainerError", () => Effect.void)
    )
  }, { timeout: 60000 })
})
