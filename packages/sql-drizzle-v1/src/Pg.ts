/**
 * @since 1.0.0
 */
import type * as Client from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { AnyRelations, EmptyRelations } from "drizzle-orm"
import type { DrizzleConfig } from "drizzle-orm"
import {
  PgAsyncDeleteBase,
  PgAsyncInsertBase,
  PgAsyncSelectBase,
  PgAsyncUpdateBase
} from "drizzle-orm/pg-core"
import type { PgRemoteDatabase } from "drizzle-orm/pg-proxy"
import { drizzle } from "drizzle-orm/pg-proxy"
import { QueryPromise } from "drizzle-orm/query-promise"
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
): Effect.Effect<PgRemoteDatabase<TSchema, TRelations>, never, Client.SqlClient> =>
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
) => Effect.Effect<PgRemoteDatabase<TSchema, TRelations>, never, Client.SqlClient> = (
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
export class PgDrizzle extends Context.Tag("@effect/sql-drizzle-v1/Pg")<
  PgDrizzle,
  PgRemoteDatabase
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<PgDrizzle, never, Client.SqlClient> = Layer.effect(PgDrizzle, make())

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithConfig: (config: DrizzleConfig<Record<string, never>>) => Layer.Layer<PgDrizzle, never, Client.SqlClient> = (
  config
) => Layer.effect(PgDrizzle, makeWithConfig(config))

// patch

declare module "drizzle-orm" {
  export interface QueryPromise<T> extends Effect.Effect<T, SqlError> {}
}
patch(QueryPromise.prototype)
// Pg v1 async classes don't extend QueryPromise, so we patch them separately
patch(PgAsyncSelectBase.prototype)
patch(PgAsyncInsertBase.prototype)
patch(PgAsyncUpdateBase.prototype)
patch(PgAsyncDeleteBase.prototype)
