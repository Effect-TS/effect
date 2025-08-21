import * as SqliteKysely from "@effect/sql-kysely/Sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import { Console, Context, Effect, Exit, Layer } from "effect"
import type { Generated } from "kysely"

export interface User {
  id: Generated<number>
  name: string
}

interface Database {
  users: User
}

class SqliteDB extends Context.Tag("SqliteDB")<SqliteDB, SqliteKysely.EffectKysely<Database>>() {}

const SqliteLive = Sqlite.SqliteClient.layer({
  filename: ":memory:"
})

const KyselyLive = Layer.effect(SqliteDB, SqliteKysely.make<Database>()).pipe(Layer.provide(SqliteLive))

Effect.gen(function*() {
  const db = yield* SqliteDB

  yield* db.schema
    .createTable("users")
    .addColumn("id", "integer", (c) => c.primaryKey().autoIncrement())
    .addColumn("name", "text", (c) => c.notNull())

  const result = yield* db.withTransaction(
    Effect.gen(function*() {
      const inserted = yield* db.insertInto("users").values({ name: "Alice" }).returningAll()
      yield* Console.log(inserted)
      const selected = yield* db.selectFrom("users").selectAll()
      yield* Console.log(selected)
      const updated = yield* db.updateTable("users").set({ name: "Bob" }).returningAll()
      yield* Console.log(updated)
      return yield* Effect.fail(new Error("rollback"))
    })
  ).pipe(Effect.exit)
  if (Exit.isSuccess(result)) {
    return yield* Effect.fail("should not reach here")
  }
  const selected = yield* db.selectFrom("users").selectAll()
  yield* Console.log(selected)
}).pipe(
  Effect.provide(KyselyLive),
  Effect.runPromise
)
