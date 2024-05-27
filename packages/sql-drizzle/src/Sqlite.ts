/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import { QueryBuilder } from "drizzle-orm/sqlite-core"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { registerDialect } from "./index.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<QueryBuilder, never, Client.Client> = Effect.gen(function*() {
  const client = yield* Client.Client
  const queryBuilder = new QueryBuilder()
  registerDialect((queryBuilder as any).getDialect(), client)
  return queryBuilder
})

/**
 * @since 1.0.0
 * @category tags
 */
export class SqliteDrizzle extends Context.Tag("@effect/sql-drizzle/Sqlite")<
  SqliteDrizzle,
  QueryBuilder
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<SqliteDrizzle, never, Client.Client> = Layer.effect(SqliteDrizzle, make)
