import * as MysqlKysely from "@effect/sql-kysely/Mysql"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"
import type { Generated } from "kysely"
import { MysqlContainer } from "./utils.js"

export interface User {
  id: Generated<number>
  name: string
  nickname: string | null
}

interface Database {
  users: User
}

class MysqlDB extends Context.Tag("MysqlDB")<MysqlDB, MysqlKysely.EffectKysely<Database>>() {}

const MysqlLive = Layer.effect(MysqlDB, MysqlKysely.make<Database>()).pipe(Layer.provide(MysqlContainer.ClientLive))

describe("MysqlKysely", () => {
  it.effect("queries", () =>
    Effect.gen(function*() {
      const db = yield* MysqlDB

      yield* db.schema
        .createTable("users")
        .addColumn("id", "serial", (c) => c.primaryKey())
        .addColumn("name", "text", (c) => c.notNull())
        .addColumn("nickname", "text")

      yield* db.insertInto("users").values({ name: "Alice" })
      const inserted = yield* db.selectFrom("users").selectAll()
      yield* db.updateTable("users").set({ name: "Bob", nickname: "The Bobinator" })
      const updated = yield* db.selectFrom("users").selectAll()
      yield* db.deleteFrom("users")
      const deleted = yield* db.selectFrom("users").selectAll()

      assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice", nickname: null }])
      assert.deepStrictEqual(updated, [{ id: 1, name: "Bob", nickname: "The Bobinator" }])
      assert.deepStrictEqual(deleted, [])
    }).pipe(Effect.provide(MysqlLive)), { timeout: 120000 })
})
