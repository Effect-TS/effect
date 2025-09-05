/**
 * @since 1.0.0
 */
import type * as Client from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { DrizzleConfig } from "drizzle-orm"
import { PgSelectBase } from "drizzle-orm/pg-core"
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
export const make = <TSchema extends Record<string, unknown> = Record<string, never>>(
  config?: Omit<DrizzleConfig<TSchema>, "logger">
): Effect.Effect<PgRemoteDatabase<TSchema>, never, Client.SqlClient> =>
  Effect.gen(function*() {
    const db = drizzle(yield* makeRemoteCallback, config)
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
    const db = drizzle(yield* makeRemoteCallback, config)
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
 *
 * @example
 * ```ts
 * const schema = {
 *     account: pgTable("account", {
 *         id: integer()
 *     })
 * }
 * 
 * export const PgLive = PgClient.layerConfig({
 * 	url: Config.redacted(""),
 * })
 * 
 * export const DrizzeLive = layerWithConfigGeneric({
 * 	casing: "snake_case",
 * 	schema,
 * }).pipe(Layer.provide(PgLive))
 * 
 * export const DBLive = Layer.mergeAll(
 * 	PgLive,
 * 	DrizzeLive,
 * )
 * 
 * export const DrizzleInstance = PgDrizzleFactory<typeof schema>()
 * 
 * const eff = Effect.gen(function* () {
 * 		const drizle = yield* DrizzleInstance
 *         // before account wouldn't be inferred.
 * 		const result = yield* drizle.query.account.findFirst()
 * }).pipe(Effect.provide(DBLive))
 * ```
 *
 */

/**
 * @since 1.0.0
 * @category tags
 */
export const PgDrizzleFactory = <TSchema extends Record<string, unknown> = Record<string, never>>() =>
  Context.GenericTag<
  "@effect/sql-drizzle/Pg",
  PgRemoteDatabase<TSchema>
>("@effect/sql-drizzle/Pg")

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeWithConfigGeneric = <TSchema extends Record<string, unknown> = Record<string, never>>(config: DrizzleConfig<TSchema>) =>
  Effect.gen(function*() {
    const db = drizzle(yield* makeRemoteCallback, config)
    return db
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWithConfigGeneric = <
  TSchema extends Record<string, unknown> = Record<string, never>
>(
  config: DrizzleConfig<TSchema>
): Layer.Layer<"@effect/sql-drizzle/Pg", never, Client.SqlClient> =>
  Layer.effect(PgDrizzleFactory<TSchema>(), makeWithConfigGeneric(config))

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<PgDrizzle, never, Client.SqlClient> = Layer.effect(PgDrizzle, make())

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
