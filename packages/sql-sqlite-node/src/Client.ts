/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import type { Connection } from "@effect/sql/Connection"
import { SqlError } from "@effect/sql/Error"
import * as Statement from "@effect/sql/Statement"
import Sqlite from "better-sqlite3"
import * as Cache from "effect/Cache"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteClient extends Client.Client {
  readonly config: SqliteClientConfig
  readonly export: Effect.Effect<Uint8Array, SqlError>
  readonly loadExtension: (path: string) => Effect.Effect<void, SqlError>
}

/**
 * @category tags
 * @since 1.0.0
 */
export const SqliteClient: Context.Tag<SqliteClient, SqliteClient> = Context.GenericTag(
  "@effect/sql-sqlite-node/SqliteClient"
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

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

interface SqliteConnection extends Connection {
  readonly export: Effect.Effect<Uint8Array, SqlError>
  readonly loadExtension: (path: string) => Effect.Effect<void, SqlError>
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: SqliteClientConfig
): Effect.Effect<SqliteClient, never, Scope.Scope> =>
  Effect.gen(function*(_) {
    const compiler = makeCompiler(options.transformQueryNames)
    const transformRows = Client.defaultTransforms(
      options.transformResultNames!
    ).array

    const makeConnection = Effect.gen(function*(_) {
      const db = new Sqlite(options.filename, {
        readonly: options.readonly ?? false
      })
      yield* _(Effect.addFinalizer(() => Effect.sync(() => db.close())))

      if (options.disableWAL !== true) {
        db.pragma("journal_mode = WAL")
      }

      const prepareCache = yield* _(
        Cache.make({
          capacity: options.prepareCacheSize ?? 200,
          timeToLive: options.prepareCacheTTL ?? Duration.minutes(10),
          lookup: (sql: string) =>
            Effect.try({
              try: () => db.prepare(sql),
              catch: (error) => new SqlError({ error })
            })
        })
      )

      const runStatement = (
        statement: Sqlite.Statement,
        params: ReadonlyArray<Statement.Primitive> = []
      ) =>
        Effect.try({
          try: () => {
            if (statement.reader) {
              return statement.all(...params) as ReadonlyArray<any>
            }
            statement.run(...params)
            return []
          },
          catch: (error) => new SqlError({ error })
        })

      const run = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = []
      ) => Effect.flatMap(prepareCache.get(sql), (s) => runStatement(s, params))

      const runRaw = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = []
      ) => Effect.map(runStatement(db.prepare(sql), params), transformRows)

      const runTransform = options.transformResultNames
        ? (sql: string, params?: ReadonlyArray<Statement.Primitive>) => Effect.map(run(sql, params), transformRows)
        : run

      const runValues = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive>
      ) =>
        Effect.acquireUseRelease(
          prepareCache.get(sql).pipe(Effect.map((_) => _.raw(true))),
          (statement) =>
            Effect.try({
              try: () => {
                if (statement.reader) {
                  return statement.all(...params) as ReadonlyArray<
                    ReadonlyArray<Statement.Primitive>
                  >
                }
                statement.run(...params)
                return []
              },
              catch: (error) => new SqlError({ error })
            }),
          (statement) => Effect.sync(() => statement.raw(false))
        )

      return identity<SqliteConnection>({
        execute(sql, params) {
          return runTransform(sql, params)
        },
        executeValues(sql, params) {
          return runValues(sql, params)
        },
        executeWithoutTransform(sql, params) {
          return run(sql, params)
        },
        executeRaw(sql, params) {
          return runRaw(sql, params)
        },
        executeStream(_sql, _params) {
          return Effect.dieMessage("executeStream not implemented")
        },
        export: Effect.try({
          try: () => db.serialize(),
          catch: (error) => new SqlError({ error })
        }),
        loadExtension(path) {
          return Effect.try({
            try: () => db.loadExtension(path),
            catch: (error) => new SqlError({ error })
          })
        }
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
        spanAttributes: [["db.system", "sqlite"]]
      }),
      {
        config: options,
        export: Effect.flatMap(acquirer, (_) => _.export),
        loadExtension: (path: string) => Effect.flatMap(acquirer, (_) => _.loadExtension(path))
      }
    )
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: Config.Config.Wrap<SqliteClientConfig>
): Layer.Layer<SqliteClient, ConfigError> =>
  Layer.scoped(
    SqliteClient,
    Effect.flatMap(Config.unwrap(config), make)
  )

const escape = Statement.defaultEscape("\"")

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompiler = (transform?: (_: string) => string) =>
  Statement.makeCompiler({
    placeholder: (_) => `?`,
    onIdentifier: transform ? (_) => escape(transform(_)) : escape,
    onRecordUpdate: () => ["", []],
    onCustom: () => ["", []]
  })
