/**
 * @since 1.0.0
 */
import type * as Client from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { AnyRelations, EmptyRelations } from "drizzle-orm"
import type { DrizzleConfig } from "drizzle-orm"
import { QueryPromise } from "drizzle-orm/query-promise"
import { SQLiteSelectBase } from "drizzle-orm/sqlite-core"
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { makeRemoteCallback, patch } from "./internal/patch.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends AnyRelations = EmptyRelations
>(
  config?: Omit<DrizzleConfig<TSchema, TRelations>, "logger">
): Effect.Effect<SqliteRemoteDatabase<TSchema, TRelations>, never, Client.SqlClient> =>
  Effect.gen(function*() {
    const db = drizzle<TSchema, TRelations>(yield* makeRemoteCallback, config)
    return db
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWithConfig: <
  TSchema extends Record<string, unknown> = Record<string, never>,
  TRelations extends AnyRelations = EmptyRelations
>(
  config: DrizzleConfig<TSchema, TRelations>
) => Effect.Effect<SqliteRemoteDatabase<TSchema, TRelations>, never, Client.SqlClient> = (
  config
) =>
  Effect.gen(function*() {
    const db = drizzle(yield* makeRemoteCallback, config)
    return db
  })

/**
 * @since 1.0.0
 * @category tags
 */
export class SqliteDrizzle extends Context.Tag("@effect/sql-drizzle-v1/Sqlite")<
  SqliteDrizzle,
  SqliteRemoteDatabase
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<SqliteDrizzle, never, Client.SqlClient> = Layer.scoped(SqliteDrizzle, make())

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithConfig: (config: DrizzleConfig<Record<string, never>>) => Layer.Layer<SqliteDrizzle, never, Client.SqlClient> = (
  config
) => Layer.effect(SqliteDrizzle, makeWithConfig(config))

// patch

declare module "drizzle-orm" {
  export interface QueryPromise<T> extends Effect.Effect<T, SqlError> {}
}
patch(QueryPromise.prototype)
patch(SQLiteSelectBase.prototype)
