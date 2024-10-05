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
import * as Exit from "effect/Exit"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
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
  readonly sdk: Libsql.Client
}

/**
 * @category tags
 * @since 1.0.0
 */
export const LibsqlClient = Context.GenericTag<LibsqlClient>("@effect/sql-libsql/LibsqlClient")

/**
 * @category tags
 * @since 1.0.0
 */
const LibsqlTransaction = Context.GenericTag<readonly [Libsql.Transaction, counter: number]>(
  "@effect/sql-libsql/LibsqlTransaction"
)

/**
 * @category models
 * @since 1.0.0
 */
export interface LibsqlClientConfig {
  /** The database URL.
   *
   * The client supports `libsql:`, `http:`/`https:`, `ws:`/`wss:` and `file:` URL. For more infomation,
   * please refer to the project README:
   *
   * https://github.com/libsql/libsql-client-ts#supported-urls
   */
  readonly url: string
  /** Authentication token for the database. */
  readonly authToken?: string | undefined
  /** Encryption key for the database. */
  readonly encryptionKey?: string | undefined
  /** URL of a remote server to synchronize database with. */
  readonly syncUrl?: string | undefined
  /** Sync interval in seconds. */
  readonly syncInterval?: number | undefined
  /** Enables or disables TLS for `libsql:` URLs.
   *
   * By default, `libsql:` URLs use TLS. You can set this option to `false` to disable TLS.
   */
  readonly tls?: boolean | undefined
  /** How to convert SQLite integers to JavaScript values:
   *
   * - `"number"` (default): returns SQLite integers as JavaScript `number`-s (double precision floats).
   * `number` cannot precisely represent integers larger than 2^53-1 in absolute value, so attempting to read
   * larger integers will throw a `RangeError`.
   * - `"bigint"`: returns SQLite integers as JavaScript `bigint`-s (arbitrary precision integers). Bigints can
   * precisely represent all SQLite integers.
   * - `"string"`: returns SQLite integers as strings.
   */
  readonly intMode?: "number" | "bigint" | "string" | undefined
  /** Concurrency limit.
   *
   * By default, the client performs up to 20 concurrent requests. You can set this option to a higher
   * number to increase the concurrency limit or set it to 0 to disable concurrency limits completely.
   */
  readonly concurrency?: number | undefined

  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

interface LibsqlConnection extends Connection {
  readonly sdk: Libsql.Client
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
      const sdk = yield* Effect.sync(() => Libsql.createClient(options as Libsql.Config))
      yield* Effect.addFinalizer(() => Effect.sync(() => sdk.close()))

      const getExecutor = Effect.serviceOption(LibsqlTransaction).pipe(
        Effect.map(Option.map(([tx]) => tx)),
        Effect.map(Option.getOrElse(() => sdk))
      )

      const run = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = []
      ) =>
        getExecutor.pipe(
          Effect.flatMap((conn) =>
            Effect.tryPromise({
              try: () => conn.execute({ sql, args: params as Array<any> }).then((results) => results.rows),
              catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
            })
          )
        )

      const runRaw = (
        sql: string,
        params: ReadonlyArray<Statement.Primitive> = []
      ) =>
        getExecutor.pipe(
          Effect.flatMap((conn) =>
            Effect.tryPromise({
              try: () => conn.execute({ sql, args: params as Array<any> }),
              catch: (cause) => new SqlError({ cause, message: "Failed to execute statement" })
            })
          )
        )

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
        executeValues(sql, params) {
          return Effect.map(run(sql, params), (rows) => rows.map((row) => Array.from(row) as Array<any>))
        },
        executeWithoutTransform(sql, params) {
          return run(sql, params)
        },
        executeUnprepared(sql, params) {
          return run(sql, params)
        },
        executeStream(_sql, _params) {
          return Effect.dieMessage("executeStream not implemented")
        },
        sdk
      })
    })

    const connection = yield* makeConnection

    const semaphore = yield* Effect.makeSemaphore(1)

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
    const makeRootTx: Effect.Effect<
      readonly [Scope.CloseableScope | undefined, Libsql.Transaction, number],
      SqlError
    > = Effect.flatMap(
      Scope.make(),
      (scope) =>
        Effect.flatMap(Scope.extend(transactionAcquirer, scope), (conn) =>
          Effect.gen(function*() {
            const tx = yield* Effect.promise(() => conn.sdk.transaction("write"))
            return [scope, tx, 0] as const
          }))
    )

    const withTransaction = <R, E, A>(
      effect: Effect.Effect<A, E, R>
    ): Effect.Effect<A, E | SqlError, R> =>
      Effect.acquireUseRelease(
        pipe(
          Effect.serviceOption(LibsqlTransaction),
          Effect.flatMap(
            Option.match({
              onNone: () => makeRootTx,
              onSome: ([conn, count]) => Effect.succeed([undefined, conn, count + 1] as const)
            })
          ),
          Effect.tap(([, conn, id]) =>
            id > 0
              ? Effect.promise(() => conn.execute(`SAVEPOINT effect_sql_${id};`))
              : conn
          )
        ),
        ([, conn, id]) => Effect.provideService(effect, LibsqlTransaction, [conn, id]),
        ([scope, conn, id], exit) => {
          const effect = Exit.isSuccess(exit)
            ? id > 0
              ? Effect.void
              : Effect.orDie(Effect.promise(() => conn.commit()))
            : Effect.orDie(
              Effect.promise<void | Libsql.ResultSet>(() =>
                id > 0 ? conn.execute(`ROLLBACK TO effect_sql_${id}`) : conn.rollback()
              )
            )
          return scope !== undefined ? Effect.ensuring(effect, Scope.close(scope, exit)) : effect
        }
      )

    return Object.assign(
      Client.make({
        acquirer: Effect.succeed(connection),
        compiler,
        transactionAcquirer,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          [Otel.SEMATTRS_DB_SYSTEM, Otel.DBSYSTEMVALUES_SQLITE]
        ]
      }),
      {
        [TypeId]: TypeId as TypeId,
        config: options,
        withTransaction,
        sdk: connection.sdk
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
