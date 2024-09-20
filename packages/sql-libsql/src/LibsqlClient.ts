/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Libsql from "@libsql/client"
import * as Otel from "@opentelemetry/semantic-conventions"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-libsql/LibsqlClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface LibsqlClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: LibsqlClientConfig
}

/**
 * @category tags
 * @since 1.0.0
 */
export const LibsqlClient = Context.GenericTag<LibsqlClient>("@effect/sql-libsql/LibsqlClient")

/**
 * @category models
 * @since 1.0.0
 */
export interface LibsqlClientConfig {
  readonly url: string
  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

interface LibsqlConnection extends Connection {
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: LibsqlClientConfig
): Effect.Effect<LibsqlClient, never, Scope.Scope> =>
  Effect.gen(function*() {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = Statement.defaultTransforms(
      options.transformResultNames!
    ).array

    const makeConnection = Effect.gen(function*() {
      const db = Libsql.createClient(options)
      yield* Effect.addFinalizer(() => Effect.sync(() => db.close()))

      const run = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = []
      ) =>
        Effect.tryPromise({
          try: () => db.execute({ sql, args: [...params] }).then((results) => results.rows),
          catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
        })

      const runRaw = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = []
      ) =>
        Effect.tryPromise({
          try: () => db.execute({ sql, args: [...params] }),
          catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
        })

      const runTransform = options.transformResultNames
        ? (sql: string, params?: ReadonlyArray<Statement.Primitive>) => Effect.map(run(sql, params), transformRows)
        : run

      return identity<LibsqlConnection>({
        execute(sql, params) {
          return runTransform(sql, params)
        },
        executeRaw(sql, params) {
          return runRaw(sql, params)
        },
        executeValues(_sql, _params) {
          return Effect.dieMessage("executeValues not implemented")
        },
        executeWithoutTransform(sql, params) {
          return run(sql, params)
        },
        executeUnprepared(sql, params) {
          return run(sql, params)
        },
        executeStream(_sql, _params) {
          return Effect.dieMessage("executeStream not implemented")
        }
      })
    })

    const semaphore = yield* Effect.makeSemaphore(1)
    const connection = yield* makeConnection

    const acquirer = semaphore.withPermits(1)(Effect.succeed(connection))
    const transactionAcquirer = Effect.uninterruptibleMask((restore) =>
      Effect.as(
        Effect.zipRight(
          restore(semaphore.take(1)),
          Effect.tap(
            Effect.scope,
            (scope) => Scope.addFinalizer(scope, semaphore.release(1))
          )
        ),
        connection
      )
    )

    return Object.assign(
      Client.make({
        acquirer,
        compiler,
        transactionAcquirer,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [Otel.SEMATTRS_DB_SYSTEM, Otel.DBSYSTEMVALUES_SQLITE]
        ]
      }) as LibsqlClient,
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
export const layer = (
  config: Config.Config.Wrap<LibsqlClientConfig>
): Layer.Layer<LibsqlClient | Client.SqlClient, ConfigError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(LibsqlClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  )
