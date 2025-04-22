/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { DrizzleConfig } from "drizzle-orm"
import { PgSelectBase } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/pg-proxy"
import type { PgRemoteDatabase } from "drizzle-orm/pg-proxy"
import { QueryPromise } from "drizzle-orm/query-promise"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { makeRemoteCallback, patch, registerDialect } from "./internal/patch.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<PgRemoteDatabase, never, Client.SqlClient> = Effect.gen(function*() {
  const client = yield* Client.SqlClient
  const db = drizzle(yield* makeRemoteCallback)
  registerDialect((db as any).dialect, client)
  return db
})

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWithConfig: (config: DrizzleConfig) => Effect.Effect<PgRemoteDatabase, never, Client.SqlClient> = (
  config
) =>
  Effect.gen(function*() {
    const client = yield* Client.SqlClient
    const db = drizzle(yield* makeRemoteCallback, config)
    registerDialect((db as any).dialect, client)
    return db
  })

/**
 * @since 1.0.0
 * @category tags
 */
export class PgDrizzle extends Context.Tag("@effect/sql-drizzle/Pg")<
  PgDrizzle,
  PgRemoteDatabase
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<PgDrizzle, never, Client.SqlClient> = Layer.effect(PgDrizzle, make)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithConfig: (config: DrizzleConfig) => Layer.Layer<PgDrizzle, never, Client.SqlClient> = (config) =>
  Layer.effect(PgDrizzle, makeWithConfig(config))

// patch

declare module "drizzle-orm" {
  export interface QueryPromise<T> extends Effect.Effect<T, SqlError> {}
}
patch(QueryPromise.prototype)
patch(PgSelectBase.prototype)
