import * as Sql from "@effect/sql"
import * as MysqlDrizzle from "@effect/sql-drizzle/mysql"
import * as Mysql from "@effect/sql-mysql2"
import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import type { StartedMySqlContainer } from "@testcontainers/mysql"
import { MySqlContainer } from "@testcontainers/mysql"
import { gte } from "drizzle-orm"
import * as D from "drizzle-orm/mysql-core"
import { Config, Effect, Layer } from "effect"
import type { ConfigError } from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"

const users = D.mysqlTable("users", {
  id: D.serial("id").primaryKey(),
  name: D.text("name")
})

describe("MySqlDrizzle", () => {
  let pgContainer: StartedMySqlContainer
  let Dependencies: Layer.Layer<
    Sql.client.Client | MysqlDrizzle.MysqlDrizzle | Mysql.client.MysqlClient,
    ConfigError
  >

  beforeAll(async () => {
    pgContainer = await new MySqlContainer("mysql:lts").start()
    const MysqlLive = Mysql.client.layer({
      url: Config.secret("MYSQL_URL")
    })
    const config = Layer.setConfigProvider(ConfigProvider.fromMap(
      new Map([
        ["MYSQL_URL", pgContainer.getConnectionUri()]
      ])
    ))

    Dependencies = Layer.mergeAll(
      MysqlLive.pipe(Layer.provide(config)),
      MysqlDrizzle.layer
    )
  }, 600000)

  afterAll(async () => {
    await pgContainer.stop()
  }, 600000)

  it.scoped("query", () =>
    Effect.gen(function*(_) {
      const sql = yield* Sql.client.Client
      const db = yield* MysqlDrizzle.MysqlDrizzle

      yield* sql`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)`

      yield* db.insert(users).values({ name: "Alice" })
      const selected = yield* db.select().from(users)
      assert.deepStrictEqual(selected, [{ id: 1, name: "Alice" }])
      yield* db.update(users).set({ name: "Bob" }).where(gte(users.id, 1))
      const updated = yield* db.select().from(users)
      assert.deepStrictEqual(updated, [{ id: 1, name: "Bob" }])
      yield* db.delete(users).where(gte(users.id, 1))
      const deleted = yield* db.select().from(users)
      assert.deepStrictEqual(deleted, [])
    }).pipe(
      Effect.provide(Dependencies)
    ))
})
