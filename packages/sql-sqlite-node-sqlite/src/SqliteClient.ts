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
import * as Scope from "effect/Scope"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"

const ATTR_DB_SYSTEM_NAME = "db.system.name"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/sql-sqlite-node-sqlite/SqliteClient"
)
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
  readonly backup: (destination: string) => Effect.Effect<BackupMetadata, SqlError>
  readonly loadExtension: (path: string) => Effect.Effect<void, SqlError>

  /** Not supported in sqlite */
  readonly updateValues: never
}

/**
 * @category models
 * @since 1.0.0
 */
export interface BackupMetadata {
  readonly totalPages: number
  readonly remainingPages: number
}

/**
 * @category tags
 * @since 1.0.0
 */
export const SqliteClient = Context.GenericTag<SqliteClient>(
  "@effect/sql-sqlite-node-sqlite/SqliteClient"
)
/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClientConfig {
  readonly filename: string
  readonly readonly?: boolean | undefined
  readonly prepareCacheSize?: number | undefined
  readonly prepareCacheTTL?: Duration.DurationInput | undefined
  readonly disableWAL?: boolean | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

interface SqliteConnection extends Connection {
  readonly export: Effect.Effect<Uint8Array, SqlError>
  readonly backup: (destination: string) => Effect.Effect<BackupMetadata, SqlError>
  readonly loadExtension: (path: string) => Effect.Effect<void, SqlError>
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: SqliteClientConfig
): Effect.Effect<SqliteClient, never, Scope.Scope | Reactivity.Reactivity> =>
  Effect.gen(function*() {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = options.transformResultNames ?
      Statement.defaultTransforms(
        options.transformResultNames
      ).array :
      undefined

    const makeConnection = Effect.gen(function*() {
      const scope = yield* Effect.scope
      const db = new DatabaseSync(options.filename, {
        readOnly: options.readonly ?? false
      })
      yield* Scope.addFinalizer(scope, Effect.sync(() => db.close()))

      if (options.disableWAL !== true) {
        db.exec("PRAGMA journal_mode = WAL")
      }

      const prepareCache = yield* Cache.make({
        capacity: options.prepareCacheSize ?? 200,
        timeToLive: options.prepareCacheTTL ?? Duration.minutes(10),
        lookup: (sql: string) =>
          Effect.try({
            try: () => db.prepare(sql),
            catch: (cause) => new SqlError({ cause, message: "Failed to prepare statement " })
          })
      })

      const p = (params: ReadonlyArray<unknown>) => params as unknown as Array<SQLInputValue>

      const runStatement = (
        statement: ReturnType<typeof db.prepare>,
        params: ReadonlyArray<unknown>,
        raw: boolean
      ) =>
        Effect.withFiberRuntime<ReadonlyArray<any>, SqlError>((fiber) => {
          if (Context.get(fiber.currentContext, Client.SafeIntegers)) {
            statement.setReadBigInts(true)
          }
          try {
            // Uses StatementSync.columns() (available since Node.js 22.12.0)
            if (raw) {
              if (statement.columns().length > 0) {
                return Effect.succeed(
                  statement.all(...p(params)) as ReadonlyArray<any>
                )
              }
              return Effect.succeed(
                statement.run(...p(params)) as unknown as ReadonlyArray<any>
              )
            }
            // For normal execute, always use all() — it returns [] for
            // non-readers, so no reader detection is needed.
            return Effect.succeed(
              statement.all(...p(params)) as ReadonlyArray<any>
            )
          } catch (cause) {
            return Effect.fail(
              new SqlError({ cause, message: "Failed to execute statement" })
            )
          }
        })

      const run = (
        sql: string,
        params: ReadonlyArray<unknown>,
        raw = false
      ) =>
        Effect.flatMap(
          prepareCache.get(sql),
          (s) => runStatement(s, params, raw)
        )

      const runValues = (
        sql: string,
        params: ReadonlyArray<unknown>
      ) =>
        Effect.flatMap(
          prepareCache.get(sql),
          (statement) => {
            // Use setReturnArrays() when available (Node.js >= 24.0.0)
            // for native array output, otherwise fall back to Object.values()
            if (typeof (statement as any).setReturnArrays === "function") {
              return Effect.acquireUseRelease(
                Effect.succeed(statement),
                (stmt) =>
                  Effect.try({
                    try: () => {
                      ;(stmt as any).setReturnArrays(true)
                      return stmt.all(...p(params)) as unknown as ReadonlyArray<
                        ReadonlyArray<unknown>
                      >
                    },
                    catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
                  }),
                (stmt) => Effect.sync(() => (stmt as any).setReturnArrays(false))
              )
            }
            // Fallback: all() returns [] for non-readers, so no reader
            // detection is needed — just convert row objects to value arrays.
            return Effect.try({
              try: () => {
                const rows = statement.all(...p(params)) as Array<
                  Record<string, unknown>
                >
                return rows.map((row) => Object.values(row)) as ReadonlyArray<
                  ReadonlyArray<unknown>
                >
              },
              catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
            })
          }
        )

      return identity<SqliteConnection>({
        execute(sql, params, transformRows) {
          return transformRows
            ? Effect.map(run(sql, params), transformRows)
            : run(sql, params)
        },
        executeRaw(sql, params) {
          return run(sql, params, true)
        },
        executeValues(sql, params) {
          return runValues(sql, params)
        },
        executeUnprepared(sql, params, transformRows) {
          const effect = runStatement(db.prepare(sql), params ?? [], false)
          return transformRows ? Effect.map(effect, transformRows) : effect
        },
        executeStream(_sql, _params) {
          return Effect.dieMessage("executeStream not implemented")
        },
        export: Effect.dieMessage("export not supported in node:sqlite"),
        backup(destination) {
          return Effect.tryPromise({
            try: async () => {
              // backup() is a module-level function available in Node.js >= 22.12.0
              const mod = await import("node:sqlite")
              if (typeof mod.backup !== "function") {
                throw new Error(
                  "backup not supported (requires Node.js >= 22.12.0)"
                )
              }
              await mod.backup(db, destination)
              return { totalPages: 0, remainingPages: 0 } as BackupMetadata
            },
            catch: (cause) => new SqlError({ cause, message: "Failed to backup database" })
          })
        },
        loadExtension(path) {
          return Effect.tap(
            Effect.try({
              try: () => db.loadExtension(path),
              catch: (cause) => new SqlError({ cause, message: "Failed to load extension" })
            }),
            () => prepareCache.invalidateAll
          )
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
      (yield* Client.make({
        acquirer,
        compiler,
        transactionAcquirer,
        spanAttributes: [
          ...(options.spanAttributes ?
            Object.entries(options.spanAttributes) :
            []),
          [ATTR_DB_SYSTEM_NAME, "sqlite"]
        ],
        transformRows
      })) as SqliteClient,
      {
        [TypeId]: TypeId as TypeId,
        config: options,
        export: Effect.flatMap(acquirer, (_) => _.export),
        backup: (destination: string) => Effect.flatMap(acquirer, (_) => _.backup(destination)),
        loadExtension: (path: string) => Effect.flatMap(acquirer, (_) => _.loadExtension(path))
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
  ).pipe(Layer.provide(Reactivity.layer))

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
  ).pipe(Layer.provide(Reactivity.layer))
