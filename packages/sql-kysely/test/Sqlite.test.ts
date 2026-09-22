import { SqlError, SqlResolver } from "@effect/sql"
import * as SqliteKysely from "@effect/sql-kysely/Sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, Option, Schema } from "effect"
import { CamelCasePlugin, type Generated, type KyselyPlugin, type QueryId } from "kysely"

export interface User {
  id: Generated<number>
  name: string
  nickname: string | null
}

interface Database {
  users: User
}

class SqliteDB extends Context.Tag("SqliteDB")<SqliteDB, SqliteKysely.EffectKysely<Database>>() {}

const SqliteLive = Sqlite.SqliteClient.layer({
  filename: ":memory:"
})

const KyselyLive = Layer.effect(SqliteDB, SqliteKysely.make<Database>()).pipe(Layer.provide(SqliteLive))

describe("SqliteKysely", () => {
  it.effect("result plugins", () =>
    Effect.gen(function*() {
      const db = yield* SqliteKysely.make<{ users: { userName: string } }>({
        plugins: [new CamelCasePlugin()]
      })
      yield* db.schema.createTable("users").addColumn("userName", "text", (c) => c.notNull())
      yield* db.insertInto("users").values({ userName: "Alice" })
      assert.deepStrictEqual(yield* db.selectFrom("users").selectAll(), [{ userName: "Alice" }])
      yield* db.withTransaction(
        db.updateTable("users").set({ userName: "Bob" }).pipe(Effect.andThen(Effect.fail("rollback")))
      ).pipe(Effect.flip)
      assert.deepStrictEqual(yield* db.selectFrom("users").selectAll(), [{ userName: "Alice" }])
    }).pipe(Effect.provide(SqliteLive)))

  it.effect("scoped result plugins", () =>
    Effect.gen(function*() {
      const db = yield* SqliteKysely.make<{ users: { user_name: string } }>()
      yield* db.schema.createTable("users").addColumn("user_name", "text")
      yield* db.insertInto("users").values({ user_name: "Alice" })
      const camel = db.withPlugin(new CamelCasePlugin())
      assert.deepStrictEqual<unknown>(yield* camel.selectFrom("users").selectAll(), [{ userName: "Alice" }])
      assert.deepStrictEqual(yield* camel.withoutPlugins().selectFrom("users").selectAll(), [{ user_name: "Alice" }])
      assert.deepStrictEqual<unknown>(yield* db.selectFrom("users").selectAll().withPlugin(new CamelCasePlugin()), [
        { userName: "Alice" }
      ])
      const query = db.selectFrom("users").selectAll()
      assert.deepStrictEqual<unknown>(yield* query.$call((q) => q.withPlugin(new CamelCasePlugin())), [
        { userName: "Alice" }
      ])
      assert.deepStrictEqual<unknown>(yield* query.$if(true, (q) => q.withPlugin(new CamelCasePlugin())), [
        { userName: "Alice" }
      ])
      assert.deepStrictEqual(yield* query.$if(false, (q) => q.withPlugin(new CamelCasePlugin())), [
        { user_name: "Alice" }
      ])
    }).pipe(Effect.provide(SqliteLive)))

  it.effect("result plugin order and query identity", () =>
    Effect.gen(function*() {
      const queries = new WeakSet<QueryId>()
      const plugin: KyselyPlugin = {
        transformQuery: ({ node, queryId }) => {
          queries.add(queryId)
          return node
        },
        transformResult: ({ queryId, result }) => {
          assert.isTrue(queries.has(queryId))
          return Promise.resolve({
            ...result,
            rows: result.rows.map((row) => ({ ...row, userName: `${row.userName}!` }))
          })
        }
      }
      const db = yield* SqliteKysely.make<{ users: { userName: string } }>({
        plugins: [new CamelCasePlugin(), plugin]
      })
      yield* db.schema.createTable("users").addColumn("userName", "text")
      yield* db.insertInto("users").values({ userName: "Alice" })
      assert.deepStrictEqual(yield* db.selectFrom("users").selectAll(), [{ userName: "Alice!" }])
    }).pipe(Effect.provide(SqliteLive)))

  it.effect("result plugin failures", () =>
    Effect.gen(function*() {
      const db = yield* SqliteKysely.make<{ users: { name: string } }>()
      yield* db.schema.createTable("users").addColumn("name", "text")
      const error = yield* db.selectFrom("users").selectAll().withPlugin({
        transformQuery: ({ node }) => node,
        transformResult: () => Promise.reject("boom")
      }).pipe(Effect.flip)
      assert(error instanceof SqlError.SqlError)
    }).pipe(Effect.provide(SqliteLive)))

  it.effect("queries", () =>
    Effect.gen(function*() {
      const db = yield* SqliteDB

      yield* db.schema
        .createTable("users")
        .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
        .addColumn("name", "text", (c) => c.notNull())
        .addColumn("nickname", "text")

      const result = yield* db.withTransaction(
        Effect.gen(function*() {
          const inserted = yield* db.insertInto("users").values({ name: "Alice" }).returningAll()
          const selected = yield* db.selectFrom("users").selectAll()
          const updated = yield* db.updateTable("users").set({ name: "Bob", nickname: "The Bobinator" }).returningAll()
          assert.deepStrictEqual(inserted, [{ id: 1, name: "Alice", nickname: null }])
          assert.deepStrictEqual(selected, [{ id: 1, name: "Alice", nickname: null }])
          assert.deepStrictEqual(updated, [{ id: 1, name: "Bob", nickname: "The Bobinator" }])
          return yield* Effect.fail(new Error("rollback"))
        })
      ).pipe(Effect.exit)
      if (Exit.isSuccess(result)) {
        assert.fail("should not reach here")
      }
      const selected = yield* db.selectFrom("users").selectAll()
      assert.deepStrictEqual(selected, [])
    }).pipe(Effect.provide(KyselyLive)))

  it.effect("select with resolver", () =>
    Effect.gen(function*() {
      const db = yield* SqliteDB

      yield* db.schema
        .createTable("users")
        .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
        .addColumn("name", "text", (c) => c.notNull())
        .addColumn("nickname", "text")

      yield* db.insertInto("users").values({ name: "Alice" })
      yield* db.insertInto("users").values({ name: "Bob", nickname: "The Bobinator" })
      yield* db.insertInto("users").values({ name: "Charlie" })

      const GetUserById = yield* SqlResolver.findById("GetUserById", {
        Id: Schema.Number,
        Result: Schema.Struct({ id: Schema.Number, name: Schema.String, nickname: Schema.NullOr(Schema.String) }),
        ResultId: (data) => data.id,
        execute: (ids) => db.selectFrom("users").where("id", "in", ids).selectAll()
      })

      const todoIds = [1, 2, 3].map((_) => GetUserById.execute(_))
      const result = yield* Effect.all(todoIds, { batching: true })
      assert.deepStrictEqual(result, [
        Option.some({ id: 1, name: "Alice", nickname: null }),
        Option.some({ id: 2, name: "Bob", nickname: "The Bobinator" }),
        Option.some({ id: 3, name: "Charlie", nickname: null })
      ])
    }).pipe(Effect.provide(KyselyLive)))
})
