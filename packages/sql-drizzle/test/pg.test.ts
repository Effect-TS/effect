import * as Sql from "@effect/sql"
import * as PgDrizzle from "@effect/sql-drizzle/pg"
import * as Pg from "@effect/sql-pg"
import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { gte } from "drizzle-orm"
import * as D from "drizzle-orm/pg-core"
import { Config, Effect, Layer } from "effect"
import type { ConfigError } from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"

const users = D.pgTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name").notNull()
})

describe("PgDrizzle", () => {
  let pgContainer: StartedPostgreSqlContainer
  let Dependencies: Layer.Layer<
    Sql.client.Client | PgDrizzle.PgDrizzle | Pg.client.PgClient,
    ConfigError,
    never
  >

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer("postgres:alpine").start()
    const pgLive = Pg.client.layer({
      url: Config.secret("PG_URL")
    })
    const config = Layer.setConfigProvider(ConfigProvider.fromMap(
      new Map([
        ["PG_URL", pgContainer.getConnectionUri()]
      ])
    ))

    Dependencies = Layer.mergeAll(
      pgLive.pipe(Layer.provide(config)),
      PgDrizzle.layer
    )
  }, 600000)

  afterAll(async () => {
    await pgContainer.stop()
  }, 600000)

  it.scoped("query", () =>
    Effect.gen(function*(_) {
      const sql = yield* Sql.client.Client
      const db = yield* PgDrizzle.PgDrizzle

      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`

      const inserted = yield* db.insert(users).values({ name: "Alice" }).returning()
      assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice" }])
      const selected = yield* db.select().from(users)
      assert.deepStrictEqual(selected, [{ id: 1, name: "Alice" }])
      const updated = yield* db.update(users).set({ name: "Bob" }).where(gte(users.id, 1)).returning()
      assert.deepStrictEqual(updated, [{ id: 1, name: "Bob" }])
      const deleted = yield* db.delete(users).where(gte(users.id, 1)).returning()
      assert.deepStrictEqual(deleted, [{ id: 1, name: "Bob" }])
    }).pipe(
      Effect.provide(Dependencies)
    ))
})
