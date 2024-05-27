import * as Sql from "@effect/sql"
import * as SqliteDrizzle from "@effect/sql-drizzle/Sqlite"
import * as Sqlite from "@effect/sql-sqlite-node"
import * as D from "drizzle-orm/sqlite-core"
import { Config, Effect, Layer } from "effect"

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
  yield* sql`INSERT INTO users (name) VALUES ('Alice')`
  const results = yield* db.select().from(users)
  console.log(results)
}).pipe(
  Effect.provide(DatabaseLive),
  Effect.runPromise
)
