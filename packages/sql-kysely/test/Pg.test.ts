import * as PgKysely from "@effect/sql-kysely/Pg"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer } from "effect"
import type { Generated } from "kysely"
import { PgContainer } from "./utils.js"

export interface User {
  id: Generated<number>
  name: string
  nickname: string | null
}

interface Database {
  users: User
}

class PgDB extends Context.Tag("PgDB")<PgDB, PgKysely.EffectKysely<Database>>() {}

const PgLive = Layer.effect(PgDB, PgKysely.make<Database>()).pipe(Layer.provide(PgContainer.ClientLive))

describe("PgKysely", () => {
  it.effect("queries", () =>
    Effect.gen(function*() {
      const db = yield* PgDB
      yield* db.schema
        .createTable("users")
        .addColumn("id", "serial", (c) => c.primaryKey())
        .addColumn("name", "text", (c) => c.notNull())
        .addColumn("nickname", "text")

      const inserted = yield* db.insertInto("users").values({ name: "Alice" }).returningAll()
      const selected = yield* db.selectFrom("users").selectAll()
      const updated = yield* db.updateTable("users").set({ name: "Bob", nickname: "The Bobinator" }).returningAll()
      const deleted = yield* db.deleteFrom("users").returningAll()

      assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice", nickname: null }])
      assert.deepStrictEqual(selected, [{ id: 1, name: "Alice", nickname: null }])
      assert.deepStrictEqual(updated, [{ id: 1, name: "Bob", nickname: "The Bobinator" }])
      assert.deepStrictEqual(deleted, [{ id: 1, name: "Bob", nickname: "The Bobinator" }])
    }).pipe(Effect.provide(PgLive)), { timeout: 60000 })
})
