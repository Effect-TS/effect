import * as MssqlKysely from "@effect/sql-kysely/Mssql"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"
import type { Generated } from "kysely"
import { MssqlContainer } from "./utils.js"

export interface User {
  id: Generated<number>
  name: string
  nickname: string | null
}

interface Database {
  users: User
}

class MssqlDB extends Context.Tag("PgDB")<MssqlDB, MssqlKysely.EffectKysely<Database>>() {}

const MssqlLive = Layer.effect(MssqlDB, MssqlKysely.make<Database>()).pipe(Layer.provide(MssqlContainer.ClientLive))

describe("MssqlKysely", () => {
  it.effect("queries", () =>
    Effect.gen(function*() {
      const db = yield* MssqlDB
      yield* db.schema
        .createTable("users")
        .addColumn("id", "integer", (c) => c.primaryKey().identity())
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
    }).pipe(Effect.provide(MssqlLive)), { timeout: 60000 })
})
