/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Otel from "@opentelemetry/semantic-conventions"
import type { DB, OpenMode, RowMode } from "@sqlite.org/sqlite-wasm"
import sqliteInit from "@sqlite.org/sqlite-wasm"
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
export const TypeId: unique symbol = Symbol.for("@effect/sql-sqlite-wasm/SqliteClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: SqliteClientConfig
  readonly export: Effect.Effect<Uint8Array, SqlError>

  /** Not supported in sqlite */
  readonly updateValues: never
}

/**
 * @category tags
 * @since 1.0.0
 */
export const SqliteClient = Context.GenericTag<SqliteClient>("@effect/sql-sqlite-wasm/SqliteClient")

/**
 * @category models
 * @since 1.0.0
 */
export type SqliteClientConfig =
  | {
    readonly mode?: "vfs"
    readonly dbName?: string
    readonly openMode?: OpenMode
    readonly spanAttributes?: Record<string, unknown>
    readonly transformResultNames?: (str: string) => string
    readonly transformQueryNames?: (str: string) => string
  }
  | {
    readonly mode: "opfs"
    readonly dbName: string
    readonly openMode?: OpenMode
    readonly spanAttributes?: Record<string, unknown>
    readonly transformResultNames?: (str: string) => string
    readonly transformQueryNames?: (str: string) => string
  }

interface SqliteConnection extends Connection {
  readonly export: Effect.Effect<Uint8Array, SqlError>
}

const initEffect = Effect.runSync(
  Effect.cached(Effect.promise(() => sqliteInit()))
)

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: SqliteClientConfig
): Effect.Effect<SqliteClient, never, Scope.Scope> =>
  Effect.gen(function*(_) {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = Statement.defaultTransforms(
      options.transformResultNames!
    ).array

    const makeConnection = Effect.gen(function*(_) {
      const sqlite3 = yield* _(initEffect)

      let db: DB
      if (options.mode === "opfs") {
        if (!sqlite3.oo1.OpfsDb) {
          yield* _(Effect.dieMessage("opfs mode not available"))
        }
        db = new sqlite3.oo1.OpfsDb!(options.dbName, options.openMode ?? "c")
      } else {
        db = new sqlite3.oo1.DB(options.dbName, options.openMode)
      }

      yield* _(Effect.addFinalizer(() => Effect.sync(() => db.close())))

      const run = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = [],
        rowMode: RowMode = "object"
      ) =>
        Effect.try({
          try: () => {
            const results: Array<any> = []
            db.exec({
              sql,
              bind: params.length ? params : undefined,
              rowMode,
              resultRows: results
            })
            return results
          },
          catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
        })

      const runTransform = options.transformResultNames
        ? (sql: string, params?: ReadonlyArray<Statement.Primitive>) => Effect.map(run(sql, params), transformRows)
        : run

      return identity<SqliteConnection>({
        execute(sql, params) {
          return runTransform(sql, params)
        },
        executeRaw(sql, params) {
          return run(sql, params)
        },
        executeValues(sql, params) {
          return run(sql, params, "array")
        },
        executeWithoutTransform(sql, params) {
          return run(sql, params)
        },
        executeUnprepared(sql, params) {
          return runTransform(sql, params)
        },
        executeStream() {
          return Effect.dieMessage("executeStream not implemented")
        },
        export: Effect.try({
          try: () => sqlite3.capi.sqlite3_js_db_export(db.pointer),
          catch: (cause) => new SqlError({ cause, message: "Failed to export database" })
        })
      })
    })

    const semaphore = yield* _(Effect.makeSemaphore(1))
    const connection = yield* _(makeConnection)

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
      }) as SqliteClient,
      {
        [TypeId]: TypeId as TypeId,
        config: options,
        export: Effect.flatMap(acquirer, (_) => _.export)
      }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: Config.Config.Wrap<SqliteClientConfig>
): Layer.Layer<SqliteClient | Client.SqlClient, ConfigError> =>
  Layer.scopedContext(
    Config.unwrap(config).pipe(
      Effect.flatMap(make),
      Effect.map((client) =>
        Context.make(SqliteClient, client).pipe(
          Context.add(Client.SqlClient, client)
        )
      )
    )
  )

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: SqliteClientConfig
): Layer.Layer<SqliteClient | Client.SqlClient, ConfigError> =>
  Layer.scopedContext(
    Effect.map(make(config), (client) =>
      Context.make(SqliteClient, client).pipe(
        Context.add(Client.SqlClient, client)
      ))
  )
