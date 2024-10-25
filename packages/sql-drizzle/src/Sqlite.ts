/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import { QueryPromise } from "drizzle-orm/query-promise"
import { SQLiteSelectBase } from "drizzle-orm/sqlite-core"
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { Scope } from "effect/Scope"
import { makeRemoteCallback, patch, registerDialect } from "./internal/patch.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<SqliteRemoteDatabase, never, Client.SqlClient | Scope> = Effect.gen(function*() {
  const client = yield* Client.SqlClient
  const db = drizzle(yield* makeRemoteCallback)
  registerDialect((db as any).dialect, client)
  return db
})

/**
 * @since 1.0.0
 * @category tags
 */
export class SqliteDrizzle extends Context.Tag("@effect/sql-drizzle/Sqlite")<
  SqliteDrizzle,
  SqliteRemoteDatabase
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<SqliteDrizzle, never, Client.SqlClient> = Layer.scoped(SqliteDrizzle, make)

// patch

declare module "drizzle-orm" {
  export interface QueryPromise<T> extends Effect.Effect<T, SqlError> {}
}
patch(QueryPromise.prototype)
patch(SQLiteSelectBase.prototype)
