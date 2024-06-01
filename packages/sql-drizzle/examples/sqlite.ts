import * as Sql from "@effect/sql"
import * as SqliteDrizzle from "@effect/sql-drizzle/sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import { gte } from "drizzle-orm"
import * as D from "drizzle-orm/sqlite-core"
import { Config, Effect, Layer } from "effect"
import * as Console from "effect/Console"

// setup

const SqlLive = Sqlite.client.layer({
  filename: Config.succeed("test.db")
})
const DrizzleLive = SqliteDrizzle.layer.pipe(
  Layer.provide(SqlLive)
)
const DatabaseLive = Layer.mergeAll(SqlLive, DrizzleLive)

// usage

const users = D.sqliteTable("users", {
  id: D.integer("id").primaryKey(),
  name: D.text("name")
})

Effect.gen(function*() {
  const sql = yield* Sql.client.Client
  const db = yield* SqliteDrizzle.SqliteDrizzle
  yield* sql`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)`
  const inserted = yield* db.insert(users).values({ name: "Alice" }).returning()
  yield* Console.log(inserted)
  const selected = yield* db.select().from(users)
  yield* Console.log(selected)
  const updated = yield* db.update(users).set({ name: "Bob" }).where(gte(users.id, 1)).returning()
  yield* Console.log(updated)
  const deleted = yield* db.delete(users).where(gte(users.id, 1)).returning()
  yield* Console.log(deleted)
}).pipe(
  Effect.provide(DatabaseLive),
  Effect.runPromise
)
