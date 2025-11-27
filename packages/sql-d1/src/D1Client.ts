/**
 * @since 1.0.0
 */
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Cache from "effect/Cache"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"

const ATTR_DB_SYSTEM_NAME = "db.system.name"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-d1/D1Client")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface D1Client extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: D1ClientConfig

  /** Not supported in d1 */
  readonly updateValues: never
}

/**
 * @category tags
 * @since 1.0.0
 */
export const D1Client = Context.GenericTag<D1Client>("@effect/sql-d1/D1Client")

/**
 * @category models
 * @since 1.0.0
 */
export interface D1ClientConfig {
  readonly db: D1Database
  readonly prepareCacheSize?: number | undefined
  readonly prepareCacheTTL?: Duration.DurationInput | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: D1ClientConfig
): Effect.Effect<D1Client, never, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = options.transformResultNames ?
      Statement.defaultTransforms(options.transformResultNames).array :
      undefined

    const makeConnection = Effect.gen(function*() {
      const db = options.db

      const prepareCache = yield* Cache.make({
        capacity: options.prepareCacheSize ?? 200,
        timeToLive: options.prepareCacheTTL ?? Duration.minutes(10),
        lookup: (sql: string) =>
          Effect.try({
            try: () => db.prepare(sql),
            catch: (cause) => new SqlError({ cause, message: `Failed to prepare statement` })
          })
      })

      const runStatement = (
        statement: D1PreparedStatement,
        params: ReadonlyArray<unknown> = []
      ): Effect.Effect<ReadonlyArray<any>, SqlError, never> =>
        Effect.tryPromise({
          try: async () => {
            const response = await statement.bind(...params).all()
            if (response.error) {
              throw response.error
            }
            return response.results || []
          },
          catch: (cause) => new SqlError({ cause, message: `Failed to execute statement` })
        })

      const runRaw = (
        sql: string,
        params: ReadonlyArray<unknown> = []
      ) => runStatement(db.prepare(sql), params)

      const runCached = (
        sql: string,
        params: ReadonlyArray<unknown> = []
      ) => Effect.flatMap(prepareCache.get(sql), (s) => runStatement(s, params))

      const runUncached = (
        sql: string,
        params: ReadonlyArray<unknown> = []
      ) => runRaw(sql, params)

      const runValues = (
        sql: string,
        params: ReadonlyArray<unknown>
      ) =>
        Effect.flatMap(
          prepareCache.get(sql),
          (statement) =>
            Effect.tryPromise({
              try: () => {
                return statement.bind(...params).raw() as Promise<
                  ReadonlyArray<
                    ReadonlyArray<unknown>
                  >
                >
              },
              catch: (cause) => new SqlError({ cause, message: `Failed to execute statement` })
            })
        )

      return identity<Connection>({
        execute(sql, params, transformRows) {
          return transformRows
            ? Effect.map(runCached(sql, params), transformRows)
            : runCached(sql, params)
        },
        executeRaw(sql, params) {
          return runRaw(sql, params)
        },
        executeValues(sql, params) {
          return runValues(sql, params)
        },
        executeUnprepared(sql, params, transformRows) {
          return transformRows
            ? Effect.map(runUncached(sql, params), transformRows)
            : runUncached(sql, params)
        },
        executeStream(_sql, _params) {
          return Effect.dieMessage("executeStream not implemented")
        }
      })
    })

    const connection = yield* makeConnection
    const acquirer = Effect.succeed(connection)
    const transactionAcquirer = Effect.dieMessage("transactions are not supported in D1")

    return Object.assign(
      (yield* Client.make({
        acquirer,
        compiler,
        transactionAcquirer,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [ATTR_DB_SYSTEM_NAME, "sqlite"]
        ],
        transformRows
      })) as D1Client,
      {
        [TypeId]: TypeId as TypeId,
        config: options
      }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: Config.Config.Wrap<D1ClientConfig>
): Layer.Layer<D1Client | Client.SqlClient, ConfigError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(D1Client, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  ).pipe(Layer.provide(Reactivity.layer))

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: D1ClientConfig
): Layer.Layer<D1Client | Client.SqlClient, ConfigError> =>
  Layer.scopedContext(
    Effect.map(make(config), (client) =>
      Context.make(D1Client, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  ).pipe(Layer.provide(Reactivity.layer))
