import * as Sql from "@effect/sql"
import * as PgDrizzle from "@effect/sql-drizzle/pg"
import * as Pg from "@effect/sql-pg"
import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import { gte } from "drizzle-orm"
import * as D from "drizzle-orm/pg-core"
import * as Effect from "effect/Effect"
import type { Scope } from "effect/Scope"
import * as Secret from "effect/Secret"

const users = D.pgTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name")
})

describe("PgDrizzle", () => {
  let pgContainer: StartedPostgreSqlContainer
  let makeClient: Effect.Effect<Pg.client.PgClient, never, Scope>

  beforeAll(async () => {
    pgContainer = await new PostgreSqlContainer("postgres:alpine").start()
    makeClient = Effect.gen(function*(_) {
      return yield* Pg.client.make({
        url: Secret.fromString(pgContainer.getConnectionUri())
      })
    })
  }, 600000)

  afterAll(async () => {
    await pgContainer.stop()
  }, 600000)

  it.scoped("query", () =>
    Effect.gen(function*(_) {
      const sql = yield* makeClient
      const db = yield* PgDrizzle.make.pipe(
        Effect.provideService(Sql.client.Client, sql)
      )

      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)`

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
